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
import { Wallet } from '../generated/prisma';

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
      throw new RpcException({
        statusCode: 403,
        message: 'Wallet is inactive',
      });
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

  async addMoney(userId: string, amount: number, idempotencyKey?: string) {
    if (amount <= 0) {
      throw new RpcException({
        statusCode: 400,
        message: 'Amount must be greater than zero',
      });
    }

    if (idempotencyKey) {
      const existing = await firstValueFrom(
        this.transactionClient.send(
          { cmd: 'find_by_idempotency_key' },
          idempotencyKey,
        ),
      );

      if (existing) {
        console.log('Duplicate request detected');

        return {
          message: 'Request already processed',
          transaction: existing,
        };
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });

      if (!wallet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Wallet not found',
        });
      }

      this.ensureWalletIsActive(wallet);

      let commissionData;
      try {
        commissionData = await firstValueFrom(
          this.commissionClient.send(
            { cmd: 'calculate_commission' },
            {
              serviceType: 'ADD_MONEY',
              amount,
            },
          ),
        );
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Commission service unavailable',
        });
      }

      const commission = Number(commissionData.commission);

      let walletTxn;
      try {
        walletTxn = await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'create_transaction' },
            {
              userId: wallet.userId,
              walletId: wallet.id,
              amount,
              rollbackAmount: amount - commission,
              type: 'CREDIT',
              status: 'INITIATED',
              description: 'Wallet Topup',
              idempotencyKey,
            },
          ),
        );
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Transaction service unavailable',
        });
      }

      let updatedWallet: Wallet;

      try {
        // const TEST_ROLLBACK = true;
        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_processing' },
            { referenceId: walletTxn.referenceId },
          ),
        );

        // if (TEST_ROLLBACK) {
        //   throw new Error('Testing rollback');
        // }

        updatedWallet = await tx.wallet.update({
          where: { userId },
          data: {
            balance: {
              increment: amount - commission,
            },
          },
        });

        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_success' },
            { referenceId: walletTxn.referenceId },
          ),
        );
      } catch (error) {
        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_rollback_pending' },
            { referenceId: walletTxn.referenceId },
          ),
        );

        if (error instanceof RpcException) {
          throw error;
        }

        throw new RpcException({
          statusCode: 500,
          message: 'Transaction failed. Rollback initiated.',
        });
      }

      if (commission > 0) {
        let commissionTxn;
        try {
          commissionTxn = await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'create_transaction' },
              {
                userId: wallet.userId,
                walletId: wallet.id,
                amount: commission,
                rollbackAmount: commission,
                type: 'DEBIT',
                status: 'INITIATED',
                description: 'Add Money Commission',
              },
            ),
          );

          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_processing' },
              { referenceId: commissionTxn.referenceId },
            ),
          );
          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_success' },
              { referenceId: commissionTxn.referenceId },
            ),
          );
        } catch (error) {
          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_rollback_pending' },
              { referenceId: walletTxn.referenceId, status: 'FAILED' },
            ),
          );
          throw error;
        }
      }

      // Notification
      try {
        await this.rabbitMQService.publish('wallet.notification', {
          userId: wallet.userId,
          event: 'ADD_MONEY',
          amount,
          commission,
          balance: updatedWallet.balance,
        });
      } catch (error) {
        console.log('Notification Failed', error);
      }

      return {
        message: 'Money added successfully',
        amount,
        commission,
        walletBalance: updatedWallet.balance,
      };
    });
  }

  async withdraw(userId: string, amount: number, idempotencyKey?: string) {
    if (amount <= 0) {
      throw new RpcException({
        statusCode: 400,
        message: 'Amount must be greater than zero',
      });
    }

    if (idempotencyKey) {
      const existing = await firstValueFrom(
        this.transactionClient.send(
          { cmd: 'find_by_idempotency_key' },
          idempotencyKey,
        ),
      );

      if (existing) {
        console.log('Duplicate request detected');

        return {
          message: 'Request already processed',
          transaction: existing,
        };
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { userId } });

      if (!wallet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Wallet not found',
        });
      }

      this.ensureWalletIsActive(wallet);
      let commissionData;
      try {
        commissionData = await firstValueFrom(
          this.commissionClient.send(
            { cmd: 'calculate_commission' },
            {
              serviceType: 'WITHDRAW',
              amount,
            },
          ),
        );
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Commission service unavailable',
        });
      }

      const commission = Number(commissionData.commission);
      const totalDebit = Number(commissionData.totalDebit);

      if (wallet.balance.lessThan(totalDebit)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Insufficient balance',
        });
      }

      let walletTxn;
      try {
        walletTxn = await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'create_transaction' },
            {
              userId: wallet.userId,
              walletId: wallet.id,
              amount,
              rollbackAmount: totalDebit,
              type: 'DEBIT',
              status: 'INITIATED',
              description: 'Wallet Withdrawal',
            },
          ),
        );
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Transaction service unavailable',
        });
      }

      let updatedWallet: Wallet;
      try {
        // const TEST_ROLLBACK = true;
        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_processing' },
            { referenceId: walletTxn.referenceId },
          ),
        );

        // if (TEST_ROLLBACK) {
        //   throw new Error('Testing rollback');
        // }

        updatedWallet = await tx.wallet.update({
          where: { userId },
          data: {
            balance: {
              decrement: totalDebit,
            },
          },
        });

        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_success' },
            { referenceId: walletTxn.referenceId },
          ),
        );
      } catch (error) {
        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_rollback_pending' },
            { referenceId: walletTxn.referenceId },
          ),
        );

        if (error instanceof RpcException) {
          throw error;
        }

        throw new RpcException({
          statusCode: 500,
          message: 'Transaction failed. Rollback initiated.',
        });
      }

      if (commission > 0) {
        let commissionTxn;
        try {
          commissionTxn = await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'create_transaction' },
              {
                userId: wallet.userId,
                walletId: wallet.id,
                amount: commission,
                rollbackAmount: commission,
                type: 'DEBIT',
                status: 'INITIATED',
                description: 'Withdrawal Commission',
              },
            ),
          );
          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_processing' },
              { referenceId: commissionTxn.referenceId },
            ),
          );

          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_success' },
              { referenceId: commissionTxn.referenceId },
            ),
          );
        } catch (error) {
          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_rollback_pending' },
              { referenceId: walletTxn.referenceId },
            ),
          );
          throw error;
        }
      }

      try {
        await this.rabbitMQService.publish('wallet.notification', {
          userId: wallet.userId,
          event: 'WITHDRAW',
          amount,
          commission,
          totalDebit,
          balance: updatedWallet.balance,
        });
      } catch (error) {
        console.log('Notification Failed', error);
      }

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

  async transferMoney(
    senderUserId: string,
    dto: TransferMoneyDto,
    idempotencyKey?: string,
  ) {
    console.log('===== TRANSFER START =====');
    console.log('Sender:', senderUserId);
    console.log(dto);

    if (dto.amount <= 0) {
      throw new RpcException({
        statusCode: 400,
        message: 'Amount must be greater than zero',
      });
    }

    let receiver;

    try {
      receiver = await firstValueFrom(
        this.authClient.send({ cmd: 'find_user_by_email' }, dto.receiverEmail),
      );
    } catch {
      throw new RpcException({
        statusCode: 503,
        message: 'Auth service unavailable',
      });
    }

    if (!receiver) {
      throw new RpcException({
        statusCode: 404,
        message: 'Receiver not found',
      });
    }

    if (receiver.id === senderUserId) {
      throw new RpcException({
        statusCode: 400,
        message: 'You cannot transfer money to yourself',
      });
    }

    if (idempotencyKey) {
      try {
        const existing = await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'find_by_idempotency_key' },
            idempotencyKey,
          ),
        );

        if (existing) {
          return {
            message: 'Request already processed',
            transaction: existing,
          };
        }
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Transaction service unavailable',
        });
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const transferGroupId = randomUUID();

      const senderWallet = await tx.wallet.findUnique({
        where: {
          userId: senderUserId,
        },
      });

      if (!senderWallet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Sender wallet not found',
        });
      }

      this.ensureWalletIsActive(senderWallet);

      const receiverWallet = await tx.wallet.findUnique({
        where: {
          userId: receiver.id,
        },
      });

      if (!receiverWallet) {
        throw new RpcException({
          statusCode: 404,
          message: 'Receiver wallet not found',
        });
      }

      this.ensureWalletIsActive(receiverWallet);

      let commissionData;

      try {
        commissionData = await firstValueFrom(
          this.commissionClient.send(
            { cmd: 'calculate_commission' },
            {
              serviceType: 'TRANSFER',
              amount: dto.amount,
            },
          ),
        );
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Commission service unavailable',
        });
      }

      const commission = Number(commissionData.commission);
      const totalDebit = Number(commissionData.totalDebit);

      if (senderWallet.balance.lessThan(totalDebit)) {
        throw new RpcException({
          statusCode: 400,
          message: 'Insufficient balance',
        });
      }

      let senderTxn: any;

      try {
        senderTxn = await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'create_transaction' },
            {
              userId: senderWallet.userId,
              walletId: senderWallet.id,
              receiverUserId: receiver.id,
              amount: dto.amount,
              rollbackAmount: totalDebit,
              type: 'DEBIT',
              status: 'INITIATED',
              description: `Transferred to ${receiver.email}`,
              transferGroupId,
              idempotencyKey,
            },
          ),
        );
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Unable to create sender transaction',
        });
      }

      let receiverTxn: any;

      try {
        receiverTxn = await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'create_transaction' },
            {
              userId: receiverWallet.userId,
              walletId: receiverWallet.id,
              receiverUserId: senderWallet.userId,
              amount: dto.amount,
              rollbackAmount: dto.amount,
              type: 'CREDIT',
              status: 'INITIATED',
              description: `Received from ${senderUserId}`,
              transferGroupId,
            },
          ),
        );
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Unable to create receiver transaction',
        });
      }

      let commissionTxn: any = null;

      if (commission > 0) {
        try {
          commissionTxn = await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'create_transaction' },
              {
                userId: senderWallet.userId,
                walletId: senderWallet.id,
                amount: commission,
                rollbackAmount: commission,
                type: 'DEBIT',
                status: 'INITIATED',
                description: 'Transfer Commission',
                transferGroupId,
              },
            ),
          );
        } catch {
          throw new RpcException({
            statusCode: 503,
            message: 'Unable to create commission transaction',
          });
        }
      }

      try {
        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_processing' },
            {
              referenceId: senderTxn.referenceId,
            },
          ),
        );

        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_processing' },
            {
              referenceId: receiverTxn.referenceId,
            },
          ),
        );

        if (commissionTxn) {
          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_processing' },
              {
                referenceId: commissionTxn.referenceId,
              },
            ),
          );
        }
      } catch {
        throw new RpcException({
          statusCode: 503,
          message: 'Unable to update transaction status',
        });
      }

      let updatedSenderWallet: Wallet;
      let updatedReceiverWallet: Wallet;

      try {
        // const TEST_ROLLBACK = true;
        // if (TEST_ROLLBACK) {
        //   throw new Error('Testing Transfer Rollback');
        // }

        updatedSenderWallet = await tx.wallet.update({
          where: {
            userId: senderUserId,
          },
          data: {
            balance: {
              decrement: totalDebit,
            },
          },
        });

        updatedReceiverWallet = await tx.wallet.update({
          where: {
            userId: receiver.id,
          },
          data: {
            balance: {
              increment: dto.amount,
            },
          },
        });

        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_success' },
            {
              referenceId: senderTxn.referenceId,
            },
          ),
        );

        await firstValueFrom(
          this.transactionClient.send(
            { cmd: 'transaction_success' },
            {
              referenceId: receiverTxn.referenceId,
            },
          ),
        );

        if (commissionTxn) {
          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_success' },
              {
                referenceId: commissionTxn.referenceId,
              },
            ),
          );
        }
      } catch (error) {
        try {
          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_rollback_pending' },
              {
                referenceId: senderTxn.referenceId,
              },
            ),
          );
        } catch {}

        try {
          await firstValueFrom(
            this.transactionClient.send(
              { cmd: 'transaction_rollback_pending' },
              {
                referenceId: receiverTxn.referenceId,
              },
            ),
          );
        } catch {}

        if (commissionTxn) {
          try {
            await firstValueFrom(
              this.transactionClient.send(
                { cmd: 'transaction_rollback_pending' },
                {
                  referenceId: commissionTxn.referenceId,
                },
              ),
            );
          } catch {}
        }

        if (error instanceof RpcException) {
          throw error;
        }

        throw new RpcException({
          statusCode: 500,
          message: 'Transfer failed. Rollback initiated.',
        });
      }

      try {
        await this.rabbitMQService.publish('wallet.notification', {
          userId: senderWallet.userId,
          event: 'TRANSFER_SENT',
          amount: dto.amount,
          commission,
          totalDebit,
          balance: updatedSenderWallet.balance,
        });

        await this.rabbitMQService.publish('wallet.notification', {
          userId: receiverWallet.userId,
          event: 'TRANSFER_RECEIVED',
          amount: dto.amount,
          balance: updatedReceiverWallet.balance,
        });
      } catch (error) {
        console.log('Notification Failed', error);
      }

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
