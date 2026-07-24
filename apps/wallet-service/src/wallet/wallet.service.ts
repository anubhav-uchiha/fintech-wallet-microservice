import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TransferMoneyDto } from './dto/transfer-money.dto';
import { randomUUID } from 'crypto';
import { CallbackDto } from './dto/callback.dto';
import { AepsWithdrawDto } from './dto/aeps-withdraw.dto';
import { AepsBalanceDto } from './dto/aeps-balance.dto';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RabbitMQService } from 'apps/fintech-wallet-microservices/src/common/rabbitmq/rabbitmq.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,

    @Inject('TRANSACTION_SERVICE')
    private readonly transactionClient: ClientProxy,

    @Inject('COMMISSION_SERVICE')
    private readonly commissionClient: ClientProxy,

    private readonly rabbitMQService: RabbitMQService,
  ) {}

  private ensureWalletIsActive(wallet: { status: string }) {
    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException(`Wallet is ${wallet.status.toLowerCase()}`);
    }
  }

  async createWallet(userId: string, session?: any) {
    const wallet = await this.prisma.wallet.create({
      data: {
        userId,
        balance: 0,
        currency: 'INR',
        status: 'ACTIVE',
      },
    });
    return wallet;
  }

  async getWalletByUserId(userId: string) {
    return await this.prisma.wallet.findUnique({
      where: {
        userId,
      },
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId,
      },
    });

    return {
      balance: wallet?.balance ?? 0,
      currency: wallet?.currency,
    };
  }

  async addMoney(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      this.ensureWalletIsActive(wallet);

      // Get commission from Commission Service
      const commissionData = await firstValueFrom(
        this.commissionClient.send(
          { cmd: 'calculate_commission' },
          {
            serviceType: 'ADD_MONEY',
            amount,
          },
        ),
      );

      const commission = Number(commissionData.commission);

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            increment: amount - commission,
          },
        },
      });

      // Wallet Credit Transaction
      await this.rabbitMQService.publish('transaction.created', {
        userId: wallet.userId,
        walletId: wallet.id,
        amount,
        type: 'CREDIT',
        status: 'SUCCESS',
        description: 'Wallet Topup',
      });

      // Commission Transaction
      if (commission > 0) {
        await this.rabbitMQService.publish('transaction.created', {
          userId: wallet.userId,
          walletId: wallet.id,
          amount: commission,
          type: 'DEBIT',
          status: 'SUCCESS',
          description: 'Add Money Commission',
        });
      }

      // Notification
      await this.rabbitMQService.publish('wallet.notification', {
        userId: wallet.userId,
        event: 'ADD_MONEY',
        amount,
        commission,
        balance: updatedWallet.balance,
      });

      return {
        message: 'Money added successfully',
        amount,
        commission,
        walletBalance: updatedWallet.balance,
      };
    });
  }

  async withdraw(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      this.ensureWalletIsActive(wallet);

      // Calculate Commission
      const commissionData = await firstValueFrom(
        this.commissionClient.send(
          { cmd: 'calculate_commission' },
          {
            serviceType: 'WITHDRAW',
            amount,
          },
        ),
      );

      const commission = Number(commissionData.commission);
      const totalDebit = Number(commissionData.totalDebit);

      if (wallet.balance.lessThan(totalDebit)) {
        throw new BadRequestException(
          `Insufficient balance. Required ₹${totalDebit}`,
        );
      }

      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: {
          balance: {
            decrement: totalDebit,
          },
        },
      });

      // Withdrawal Transaction
      await this.rabbitMQService.publish('transaction.created', {
        userId: wallet.userId,
        walletId: wallet.id,
        amount,
        type: 'DEBIT',
        status: 'SUCCESS',
        description: 'Wallet Withdrawal',
      });

      // Commission Transaction
      if (commission > 0) {
        await this.rabbitMQService.publish('transaction.created', {
          userId: wallet.userId,
          walletId: wallet.id,
          amount: commission,
          type: 'DEBIT',
          status: 'SUCCESS',
          description: 'Withdrawal Commission',
        });
      }

      // Notification
      await this.rabbitMQService.publish('wallet.notification', {
        userId: wallet.userId,
        event: 'WITHDRAW',
        amount,
        commission,
        totalDebit,
        balance: updatedWallet.balance,
      });

      return {
        message: 'Money withdrawn successfully',
        withdrawAmount: amount,
        commission,
        totalDebited: totalDebit,
        balance: updatedWallet.balance,
      };
    });
  }

  async getTransactions(userId: string, query: any) {
    return firstValueFrom(
      this.transactionClient.send(
        { cmd: 'get_transactions' },
        {
          userId,
          query,
        },
      ),
    );
  }

  async transferMoney(senderUserId: string, dto: TransferMoneyDto) {
    console.log('===== TRANSFER START =====');
    console.log('Sender:', senderUserId);
    console.log(dto);

    // Find Receiver
    const receiver = await firstValueFrom(
      this.authClient.send({ cmd: 'find_user_by_email' }, dto.receiverEmail),
    );

    console.log('Receiver Found');
    console.log(receiver);

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    if (receiver.id === senderUserId) {
      throw new BadRequestException('You cannot transfer money to yourself');
    }

    return this.prisma.$transaction(async (tx) => {
      const transferGroupId = randomUUID();

      // Sender Wallet
      const senderWallet = await tx.wallet.findUnique({
        where: {
          userId: senderUserId,
        },
      });

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      this.ensureWalletIsActive(senderWallet);

      // Receiver Wallet
      const receiverWallet = await tx.wallet.findUnique({
        where: {
          userId: receiver.id,
        },
      });

      if (!receiverWallet) {
        throw new NotFoundException('Receiver wallet not found');
      }

      this.ensureWalletIsActive(receiverWallet);

      // Commission
      const commissionData = await firstValueFrom(
        this.commissionClient.send(
          { cmd: 'calculate_commission' },
          {
            serviceType: 'TRANSFER',
            amount: dto.amount,
          },
        ),
      );

      const commission = Number(commissionData.commission);
      const totalDebit = Number(commissionData.totalDebit);

      if (senderWallet.balance.lessThan(totalDebit)) {
        throw new BadRequestException('Insufficient balance');
      }

      // Debit Sender
      const updatedSenderWallet = await tx.wallet.update({
        where: {
          userId: senderUserId,
        },
        data: {
          balance: {
            decrement: totalDebit,
          },
        },
      });

      // Credit Receiver
      const updatedReceiverWallet = await tx.wallet.update({
        where: {
          userId: receiver.id,
        },
        data: {
          balance: {
            increment: dto.amount,
          },
        },
      });

      // Commission Transaction
      console.log('PUBLISH Commission');
      await this.rabbitMQService.publish('transaction.created', {
        userId: senderWallet.userId,
        walletId: senderWallet.id,
        amount: commission,
        type: 'DEBIT',
        status: 'SUCCESS',
        description: 'Transfer Commission',
        transferGroupId,
      });

      // Sender Transaction
      console.log('PUBLSINING SENDER DEBIT');
      await this.rabbitMQService.publish('transaction.created', {
        userId: senderWallet.userId,
        receiverUserId: receiver.id,
        walletId: senderWallet.id,
        amount: dto.amount,
        type: 'DEBIT',
        status: 'SUCCESS',
        description: `Transferred to ${receiver.email}`,
        transferGroupId,
      });

      // Receiver Transaction
      console.log('PUBLISHING RECEIVER CREDIT');
      await this.rabbitMQService.publish('transaction.created', {
        userId: receiverWallet.userId,
        receiverUserId: senderWallet.userId,
        walletId: receiverWallet.id,
        amount: dto.amount,
        type: 'CREDIT',
        status: 'SUCCESS',
        description: `Received from ${senderWallet.userId}`,
        transferGroupId,
      });

      // Sender Notification
      await this.rabbitMQService.publish('wallet.notification', {
        userId: senderWallet.userId,
        event: 'TRANSFER_SENT',
        amount: dto.amount,
        commission,
        totalDebit,
        balance: updatedSenderWallet.balance,
      });

      // Receiver Notification
      await this.rabbitMQService.publish('wallet.notification', {
        userId: receiverWallet.userId,
        event: 'TRANSFER_RECEIVED',
        amount: dto.amount,
        balance: updatedReceiverWallet.balance,
      });

      return {
        message: 'Money transferred successfully',
        transferAmount: dto.amount,
        commission,
        totalDebited: totalDebit,
        senderBalance: updatedSenderWallet.balance,
        receiverBalance: updatedReceiverWallet.balance,
        transferGroupId,
      };
    });
  }

  async getTransactionByReference(userId: string, referenceId: string) {
    return firstValueFrom(
      this.transactionClient.send(
        { cmd: 'get_transaction_reference' },
        {
          userId,
          referenceId,
        },
      ),
    );
  }

  async rollbackTransaction(userId: string, referenceId: string) {
    try {
      return this.prisma.$transaction(async (tx) => {
        console.log('STEP 1');
        const transaction = await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'find_transaction_by_reference' },
            referenceId,
          ),
        );

        console.log('STEP 2');
        console.log(transaction);

        if (!transaction) {
          throw new RpcException({
            statusCode: 404,
            message: 'Transaction not found',
          });
        }

        console.log('step 3');
        console.log(transaction.type);

        if (transaction.type === 'CREDIT') {
          throw new RpcException({
            statusCode: 400,
            message:
              'Invalid refrence Id. please use the sender sedit transaction refrence Id.',
          });
        }

        console.log('step 4');

        if (transaction.description.includes('Commission')) {
          throw new RpcException({
            statusCode: 400,
            message: 'Commission transactions cannot be rolled back.',
          });
        }

        if (transaction.userId !== userId) {
          throw new RpcException({
            statusCode: 400,
            message: 'You can rollback only your own transaction',
          });
        }

        if (transaction.isRollback) {
          throw new RpcException({
            statusCode: 400,
            message: 'Rollback transaction cannot be rolled back',
          });
        }

        if (transaction.isReversed) {
          throw new RpcException({
            statusCode: 400,
            message: 'Transaction already rolled back',
          });
        }

        if (!transaction.transferGroupId) {
          throw new RpcException({
            statusCode: 400,
            message: 'Rollback supported only for transfer transactions',
          });
        }

        const transactions = await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'find_transfer_transactions' },
            transaction.transferGroupId,
          ),
        );

        if (transactions.length < 2) {
          throw new RpcException({
            statusCode: 400,
            message: 'Invalid transfer record',
          });
        }

        const debitTransaction = transactions.find(
          (t) => t.type === 'DEBIT' && !t.description.includes('Commission'),
        );

        const creditTransaction = transactions.find((t) => t.type === 'CREDIT');

        // const commissionTransaction = transactions.find(
        //   (t) => t.type === 'DEBIT' && t.description.includes('Commission'),
        // );

        if (!debitTransaction || !creditTransaction) {
          throw new RpcException({
            statusCode: 400,
            message: 'Transfer records are corrupted',
          });
        }

        const senderWallet = await tx.wallet.findUnique({
          where: {
            id: debitTransaction.walletId,
          },
        });

        const receiverWallet = await tx.wallet.findUnique({
          where: {
            id: creditTransaction.walletId,
          },
        });

        if (!senderWallet || !receiverWallet) {
          throw new RpcException({
            statusCode: 404,
            message: 'Wallet not found',
          });
        }

        if (receiverWallet.balance.lessThan(debitTransaction.amount)) {
          throw new RpcException({
            statusCode: 400,
            message: 'Receiver has insufficient balance for rollback',
          });
        }

        // const refundAmount =
        //   Number(debitTransaction.amount) +
        //   Number(commissionTransaction?.amount ?? 0);

        const refundAmount = Number(debitTransaction.amount);

        const updatedSender = await tx.wallet.update({
          where: {
            id: senderWallet.id,
          },
          data: {
            balance: {
              increment: refundAmount,
            },
          },
        });

        const updatedReceiver = await tx.wallet.update({
          where: {
            id: receiverWallet.id,
          },
          data: {
            balance: {
              decrement: Number(debitTransaction.amount),
            },
          },
        });

        await this.rabbitMQService.publish('transaction.created', {
          userId: senderWallet.userId,
          walletId: senderWallet.id,
          amount: refundAmount,
          type: 'CREDIT',
          status: 'SUCCESS',
          description: 'Rollback of transfer',
          isRollback: true,
          referenceTransactionId: debitTransaction.id,
          transferGroupId: transaction.transferGroupId,
        });

        await this.rabbitMQService.publish('transaction.created', {
          userId: receiverWallet.userId,
          walletId: receiverWallet.id,
          amount: Number(debitTransaction.amount),
          type: 'DEBIT',
          status: 'SUCCESS',
          description: 'Rollback of transfer',
          isRollback: true,
          referenceTransactionId: creditTransaction.id,
          transferGroupId: transaction.transferGroupId,
        });

        await this.rabbitMQService.publish(
          'transaction.rollback',
          transaction.transferGroupId,
        );

        await this.rabbitMQService.publish('wallet.notification', {
          userId: senderWallet.userId,
          event: 'ROLLBACK_SUCCESS',
          amount: refundAmount,
          balance: updatedSender.balance,
        });

        await this.rabbitMQService.publish('wallet.notification', {
          userId: receiverWallet.userId,
          event: 'ROLLBACK_DEBIT',
          amount: Number(debitTransaction.amount),
          balance: updatedReceiver.balance,
        });

        return {
          message: 'Transaction rolled back successfully',
          transferGroupId: transaction.transferGroupId,
          senderBalance: updatedSender.balance,
          receiverBalance: updatedReceiver.balance,
        };
      });
    } catch (error) {
      console.log('ROLLBACK ERROR');
      console.log(error);
      throw error;
    }
  }

  async getTransactionStatus(userId: string, referenceId: string) {
    return await firstValueFrom(
      this.transactionClient.send(
        { cmd: 'transaction_status' },
        {
          userId,
          referenceId,
        },
      ),
    );
  }

  async paymentCallback(dto: CallbackDto) {
    const transaction = await firstValueFrom(
      this.transactionClient.send({ cmd: 'update_transaction_status' }, dto),
    );

    return {
      message: 'Callback processed successfully',
      transaction,
    };
  }

  async aepsWithdraw(userId: string, dto: AepsWithdrawDto) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({
        where: {
          userId,
        },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      this.ensureWalletIsActive(wallet);

      // Simulate Bank Response
      const bankResponse = 'SUCCESS';

      if (bankResponse !== 'SUCCESS') {
        throw new BadRequestException('Bank rejected AEPS withdrawal');
      }

      const updatedWallet = await tx.wallet.update({
        where: {
          userId,
        },
        data: {
          balance: {
            increment: dto.amount,
          },
        },
      });

      // Create Transaction
      await this.rabbitMQService.publish('transaction.created', {
        userId: wallet.userId,
        walletId: wallet.id,
        amount: dto.amount,
        type: 'CREDIT',
        status: 'SUCCESS',
        description: `AEPS Cash Withdrawal - ${dto.bankName}`,
      });

      // Notification
      await this.rabbitMQService.publish('wallet.notification', {
        userId: wallet.userId,
        event: 'AEPS_WITHDRAW',
        amount: dto.amount,
        bankName: dto.bankName,
        balance: updatedWallet.balance,
      });

      return {
        message: 'AEPS withdrawal successful',
        amount: dto.amount,
        bankName: dto.bankName,
        walletBalance: updatedWallet.balance,
      };
    });
  }
  async aepsBalance(userId: string, dto: AepsBalanceDto) {
    const wallet = await this.prisma.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    this.ensureWalletIsActive(wallet);

    // Simulated Bank Response
    const bankResponse = {
      bankBalance: 25480,
      accountHolder: 'Anubhav',
      bankName: dto.bankName,
      status: 'SUCCESS',
    };

    await this.rabbitMQService.publish('wallet.notification', {
      userId: wallet.userId,
      event: 'AEPS_BALANCE_ENQUIRY',
      bankName: dto.bankName,
      bankBalance: bankResponse.bankBalance,
    });

    return {
      message: 'Balance enquiry successful',
      aadhaarNumber: dto.aadhaarNumber,
      ...bankResponse,
    };
  }
}
