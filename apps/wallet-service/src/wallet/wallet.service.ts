import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Wallet, WalletDocument } from './wallet.schema';
import { Connection, Model } from 'mongoose';
import { TransferMoneyDto } from './dto/transfer-money.dto';
import { randomUUID } from 'crypto';
import { CallbackDto } from './dto/callback.dto';
import { AepsWithdrawDto } from './dto/aeps-withdraw.dto';
import { AepsBalanceDto } from './dto/aeps-balance.dto';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import { RabbitMQService } from 'apps/fintech-wallet-microservices/src/common/rabbitmq/rabbitmq.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectModel(Wallet.name)
    private readonly walletModel: Model<WalletDocument>,

    @InjectConnection()
    private readonly connection: Connection,

    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientProxy,

    @Inject('TRANSACTION_SERVICE')
    private readonly transactionClient: ClientProxy,

    @Inject('COMMISSION_SERVICE')
    private readonly commissionClient: ClientProxy,

    private readonly rabbitMQService: RabbitMQService,
  ) {}

  private ensureWalletIsActive(wallet: WalletDocument) {
    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException(`Wallet is ${wallet.status.toLowerCase()}`);
    }
  }

  async createWallet(userId: string, session?: any): Promise<WalletDocument> {
    const wallet = await this.walletModel.create(
      [
        {
          userId,
          balance: 0,
          currency: 'INR',
          status: 'ACTIVE',
        },
      ],
      { session },
    );
    return wallet[0];
  }

  async getWalletByUserId(userId: string) {
    return await this.walletModel.findOne({
      userId,
    });
  }

  async getBalance(userId: string) {
    const wallet = await this.walletModel.findOne({
      userId,
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

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const wallet = await this.walletModel
        .findOne({ userId })
        .session(session);

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

      const commission = commissionData.commission;

      wallet.balance += amount - commission;

      await wallet.save({ session });

      // Wallet Credit Transaction
      await this.rabbitMQService.publish('transaction.created', {
        userId: wallet.userId,
        walletId: wallet._id,
        amount,
        type: 'CREDIT',
        status: 'SUCCESS',
        description: 'Wallet Topup',
      });

      // Commission Transaction
      if (commission > 0) {
        await this.rabbitMQService.publish('transaction.created', {
          userId: wallet.userId,
          walletId: wallet._id,
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
        balance: wallet.balance,
      });

      await session.commitTransaction();

      return {
        message: 'Money added successfully',
        amount,
        commission,
        walletBalance: wallet.balance,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async withdraw(userId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    try {
      const wallet = await this.walletModel
        .findOne({ userId })
        .session(session);

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

      const commission = commissionData.commission;
      const totalDebit = commissionData.totalDebit;

      if (wallet.balance < totalDebit) {
        throw new BadRequestException(
          `Insufficient balance. Required ₹${totalDebit}`,
        );
      }

      // Deduct amount + commission
      wallet.balance -= totalDebit;

      await wallet.save({ session });

      // Withdrawal Transaction
      await this.rabbitMQService.publish('transaction.created', {
        userId: wallet.userId,
        walletId: wallet._id,
        amount,
        type: 'DEBIT',
        status: 'SUCCESS',
        description: 'Wallet Withdrawal',
      });

      // Commission Transaction
      if (commission > 0) {
        await this.rabbitMQService.publish('transaction.created', {
          userId: wallet.userId,
          walletId: wallet._id,
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
        balance: wallet.balance,
      });

      await session.commitTransaction();

      return {
        message: 'Money withdrawn successfully',
        withdrawAmount: amount,
        commission,
        totalDebited: totalDebit,
        balance: wallet.balance,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
    const receiver = await firstValueFrom(
      this.authClient.send({ cmd: 'find_user_by_email' }, dto.receiverEmail),
    );

    console.log('Receiver Found');
    console.log(receiver);

    if (!receiver) {
      throw new NotFoundException('Receiver not found');
    }

    if (receiver._id.toString() === senderUserId) {
      throw new BadRequestException('You cannot transfer money to yourself');
    }

    const session = await this.connection.startSession();
    session.startTransaction();

    const transferGroupId = randomUUID();

    try {
      const senderWallet = await this.walletModel
        .findOne({ userId: senderUserId.toString() })
        .session(session);

      if (!senderWallet) {
        throw new NotFoundException('Sender wallet not found');
      }

      this.ensureWalletIsActive(senderWallet);

      if (senderWallet.status === 'FROZEN') {
        throw new BadRequestException('Wallet is frozen');
      }

      const receiverWallet = await this.walletModel
        .findOne({ userId: receiver._id.toString() })
        .session(session);

      if (!receiverWallet) {
        throw new NotFoundException('Receiver wallet not found');
      }

      this.ensureWalletIsActive(receiverWallet);

      if (receiverWallet.status === 'FROZEN') {
        throw new BadRequestException('Receiver wallet is frozen');
      }

      console.log('Calling Commission Service...');

      const commissionData = await firstValueFrom(
        this.commissionClient.send(
          { cmd: 'calculate_commission' },
          {
            serviceType: 'TRANSFER',
            amount: dto.amount,
          },
        ),
      );

      const commission = commissionData.commission;
      const totalDebit = commissionData.totalDebit;

      if (senderWallet.balance < totalDebit) {
        throw new BadRequestException('Insufficient balance');
      }

      senderWallet.balance -= totalDebit;
      receiverWallet.balance += dto.amount;

      await senderWallet.save({ session });
      await receiverWallet.save({ session });

      // Commission Transaction
      await this.rabbitMQService.publish('transaction.created', {
        userId: senderWallet.userId,
        walletId: senderWallet._id,
        amount: commission,
        type: 'DEBIT',
        status: 'SUCCESS',
        description: 'Transfer Commission',
        transferGroupId,
      });

      // Sender Transaction
      await this.rabbitMQService.publish('transaction.created', {
        userId: senderWallet.userId,
        receiverUserId: receiver._id,
        walletId: senderWallet._id,
        amount: dto.amount,
        type: 'DEBIT',
        status: 'SUCCESS',
        description: `Transferred to ${receiver.email}`,
        transferGroupId,
      });

      // Receiver Transaction
      await this.rabbitMQService.publish('transaction.created', {
        userId: receiverWallet.userId,
        receiverUserId: senderWallet.userId,
        walletId: receiverWallet._id,
        amount: dto.amount,
        type: 'CREDIT',
        status: 'SUCCESS',
        description: `Received from ${senderUserId}`,
        transferGroupId,
      });

      await session.commitTransaction();

      return {
        message: 'Money transferred successfully',
        transferAmount: dto.amount,
        commission,
        totalDebited: totalDebit,
      };
    } catch (error) {
      console.log('=======================');
      console.log(error);
      console.log('=======================');

      await session.abortTransaction();

      throw error;
    } finally {
      session.endSession();
    }
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
    const session = await this.connection.startSession();

    session.startTransaction();

    try {
      const transaction = await firstValueFrom(
        this.transactionClient.send(
          { cmd: 'find_transaction_by_reference' },
          referenceId,
        ),
      );

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (transaction.userId.toString() !== userId) {
        throw new BadRequestException(
          'You can rollback only your own transaction',
        );
      }

      if (transaction.isRollback) {
        throw new BadRequestException(
          'Rollback transaction cannot be rolled back',
        );
      }

      if (transaction.isReversed) {
        throw new BadRequestException('Transaction already rolled back');
      }

      if (!transaction.transferGroupId) {
        throw new BadRequestException(
          'Rollback supported only for transfer transactions',
        );
      }

      const transactions = await firstValueFrom(
        this.transactionClient.send(
          { cmd: 'find_transfer_transactions' },
          transaction.transferGroupId,
        ),
      );

      if (transactions.length < 2) {
        throw new BadRequestException('Invalid transfer record');
      }

      const debitTransaction = transactions.find(
        (t) => t.type === 'DEBIT' && !t.description.includes('Commission'),
      );

      const creditTransaction = transactions.find((t) => t.type === 'CREDIT');

      if (!debitTransaction || !creditTransaction) {
        throw new BadRequestException('Transfer records are corrupted');
      }

      const senderWallet = await this.walletModel
        .findById(debitTransaction.walletId)
        .session(session);

      const receiverWallet = await this.walletModel
        .findById(creditTransaction.walletId)
        .session(session);

      if (!senderWallet || !receiverWallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (receiverWallet.balance < debitTransaction.amount) {
        throw new BadRequestException(
          'Receiver has insufficient balance for rollback',
        );
      }

      senderWallet.balance += debitTransaction.amount;

      receiverWallet.balance -= debitTransaction.amount;

      await senderWallet.save({ session });

      await receiverWallet.save({ session });

      const rollbackDebit = await this.rabbitMQService.publish(
        'transaction.created',
        {
          userId: senderWallet.userId,
          walletId: senderWallet._id,
          amount: debitTransaction.amount,
          type: 'CREDIT',
          status: 'SUCCESS',
          description: 'Rollback of transfer',
          isRollback: true,
          referenceTransactionId: debitTransaction._id,
          transferGroupId: debitTransaction.transferGroupId,
        },
      );

      const rollbackCredit = await this.rabbitMQService.publish(
        'transaction.created',
        {
          userId: receiverWallet.userId,
          walletId: receiverWallet._id,
          amount: creditTransaction.amount,
          type: 'DEBIT',
          status: 'SUCCESS',
          description: 'Rollback of transfer',
          isRollback: true,
          referenceTransactionId: creditTransaction._id,
          transferGroupId: creditTransaction.transferGroupId,
        },
      );

      await this.rabbitMQService.publish(
        'transaction.rollback',
        transaction.transferGroupId,
      );

      await session.commitTransaction();

      return {
        message: 'Transaction rolled back successfully',
        transferGroupId: transaction.transferGroupId,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
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
    const session = await this.connection.startSession();

    session.startTransaction();

    try {
      const wallet = await this.walletModel
        .findOne({ userId })
        .session(session);

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      this.ensureWalletIsActive(wallet);

      if (dto.amount <= 0) {
        throw new BadRequestException('Amount must be greater than zero');
      }

      // Simulate Bank Response
      const bankResponse = 'SUCCESS';

      if (bankResponse !== 'SUCCESS') {
        throw new BadRequestException('Bank rejected AEPS withdrawal');
      }

      wallet.balance += dto.amount;

      await wallet.save({ session });

      await this.rabbitMQService.publish('transaction.created', {
        userId: wallet.userId,
        walletId: wallet._id,
        amount: dto.amount,
        type: 'CREDIT',
        status: 'SUCCESS',
        description: `AEPS Cash Withdrawal - ${dto.bankName}`,
      });

      await session.commitTransaction();

      return {
        message: 'AEPS withdrawal successful',
        amount: dto.amount,
        bankName: dto.bankName,
        walletBalance: wallet.balance,
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async aepsBalance(userId: string, dto: AepsBalanceDto) {
    const wallet = await this.walletModel.findOne({
      userId,
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    this.ensureWalletIsActive(wallet);

    const bankResponse = {
      bankBalance: 25480,
      accountHolder: 'Anubhav',
      bankName: dto.bankName,
      status: 'SUCCESS',
    };

    return {
      message: 'Balance enquiry successful',
      aadhaarNumber: dto.aadhaarNumber,
      ...bankResponse,
    };
  }
}
