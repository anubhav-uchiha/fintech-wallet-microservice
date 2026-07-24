import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Transaction, TransactionDocument } from './transaction.schema';
import { generateTransactionReference } from 'apps/fintech-wallet-microservices/src/common/utils/generate-reference';

@Injectable()
export class TransactionService {
  constructor(
    @InjectModel(Transaction.name)
    private readonly transactionModel: Model<TransactionDocument>,
  ) {}

  async createTransaction(data: Partial<Transaction>) {
    const referenceId = generateTransactionReference();

    const transaction = await this.transactionModel.create({
      referenceId,
      ...data,
    });

    return transaction;
  }

  async getUserTransactions(userId: string, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const skip = (page - 1) * limit;

    const filter: any = {
      userId,
    };

    if (query.type) {
      filter.type = query.type;
    }

    if (query.status) {
      filter.status = query.status;
    }

    const data = await this.transactionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await this.transactionModel.countDocuments(filter);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async getTransactionById(transactionId: string, userId: string) {
    const transaction = await this.transactionModel.findById(transactionId);

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.userId.toString() !== userId) {
      throw new ForbiddenException('You cannot access this transaction');
    }

    return transaction;
  }

  async getTransactionByReference(userId: string, referenceId: string) {
    const transaction = await this.transactionModel.findOne({
      userId,
      referenceId,
    });

    return transaction;
  }

  async getTransactionSummary(userId: string) {
    const transactions = await this.transactionModel.find({
      userId,
    });

    let totalCredit = 0;
    let totalDebit = 0;

    let success = 0;
    let failed = 0;
    let pending = 0;

    for (const transaction of transactions) {
      if (transaction.type === 'CREDIT') {
        totalCredit += transaction.amount;
      }

      if (transaction.type === 'DEBIT') {
        totalDebit += transaction.amount;
      }

      if (transaction.status === 'SUCCESS') {
        success++;
      }

      if (transaction.status === 'FAILED') {
        failed++;
      }

      if (transaction.status === 'PENDING') {
        pending++;
      }
    }

    return {
      totalCredit,
      totalDebit,
      totalTransactions: transactions.length,
      successfulTransactions: success,
      failedTransactions: failed,
      pendingTransactions: pending,
    };
  }

  async findByReferenceId(referenceId: string) {
    return this.transactionModel.findOne({
      referenceId,
    });
  }

  async findTransactionByReference(referenceId: string) {
    const transaction = await this.transactionModel.findOne({
      referenceId,
    });

    return transaction;
  }

  async findTransferTransactions(transferGroupId: string) {
    return this.transactionModel.find({
      transferGroupId,
    });
  }

  async getStatus(userId: string, referenceId: string) {
    const transaction = await this.transactionModel.findOne({
      userId,
      referenceId,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      referenceId: transaction.referenceId,
      status: transaction.status,
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
    };
  }

  async updateTransactionStatus(referenceId: string, status: string) {
    const transaction = await this.transactionModel.findOne({
      referenceId,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    transaction.status = status;

    await transaction.save();

    return transaction;
  }

  async markRollback(transferGroupId: string) {
    console.log('Rollback Group:', transferGroupId);

    const result = await this.transactionModel.updateMany(
      {
        transferGroupId,
        isRollback: false,
      },
      {
        $set: {
          isReversed: true,
        },
      },
    );

    console.log(result);

    return result;
  }
}
