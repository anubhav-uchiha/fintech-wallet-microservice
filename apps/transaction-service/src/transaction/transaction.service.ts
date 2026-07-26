import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { generateTransactionReference } from 'apps/fintech-wallet-microservices/src/common/utils/generate-reference';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TransactionStatus } from '../generated/prisma';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async createTransaction(data: any) {
    console.log('Step 1');
    const referenceId = generateTransactionReference();
    console.log(referenceId);
    console.log(data);

    console.log('STEP 2');
    try {
      const transaction = await this.prisma.transaction.create({
        data: {
          referenceId: referenceId,
          idempotencyKey: data.idempotencyKey ?? null,
          userId: data.userId,
          walletId: data.walletId,
          amount: new Prisma.Decimal(data.amount),
          rollbackAmount:
            data.rollbackAmount == null
              ? null
              : new Prisma.Decimal(data.rollbackAmount),
          type: data.type,
          status: TransactionStatus.INITIATED,
          description: data.description,
          receiverUserId: data.receiverUserId ?? null,
          isRollback: data.isRollback ?? false,
          isReversed: data.isReversed ?? false,
          referenceTransactionId: data.referenceTransactionId ?? null,
          transferGroupId: data.transferGroupId ?? null,
        },
      });
      console.log('Step 3');

      return transaction;
    } catch (error: any) {
      if (
        error.code === 'P2002' &&
        error.meta?.target?.includes('idempotencyKey')
      ) {
        return this.prisma.transaction.findUnique({
          where: { idempotencyKey: data.idempotencyKey },
        });
      }
      throw error;
    }
  }

  async findByIdempotencyKey(idempotencyKey: string) {
    return this.prisma.transaction.findUnique({ where: { idempotencyKey } });
  }

  async markProcessing(referenceId: string) {
    return this.prisma.transaction.update({
      where: { referenceId },
      data: { status: TransactionStatus.PROCESSING },
    });
  }

  async markSuccess(referenceId: string) {
    return this.prisma.transaction.update({
      where: {
        referenceId,
      },
      data: {
        status: TransactionStatus.SUCCESS,
      },
    });
  }

  async markRollbackPending(referenceId: string) {
    return this.prisma.transaction.update({
      where: { referenceId },
      data: { status: TransactionStatus.ROLLBACK_PENDING },
    });
  }

  async getRollbackPendingTransactions() {
    return this.prisma.transaction.findMany({
      where: {
        status: 'ROLLBACK_PENDING',
      },
    });
  }

  async markRolledBack(referenceId: string) {
    return this.prisma.transaction.update({
      where: {
        referenceId,
      },
      data: {
        status: TransactionStatus.ROLLED_BACK,
        isRollback: true,
        isReversed: true,
      },
    });
  }

  async getUserTransactions(userId: string, query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;

    const skip = (page - 1) * limit;

    const where: any = {
      userId,
    };

    if (query.type) {
      where.type = query.type;
    }

    if (query.status) {
      where.status = query.status;
    }

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: {
          createdAt: 'desc',
        },
        skip: skip,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      data: transactions,
    };
  }

  async getTransactionById(transactionId: string, userId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new RpcException({
        statusCode: 404,
        message: 'Transaction not found',
      });
    }

    if (transaction.userId.toString() !== userId) {
      throw new RpcException({
        statuCode: 403,
        message: 'You cannot access this transaction',
      });
    }

    return transaction;
  }

  async getTransactionByReference(userId: string, referenceId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        userId,
        referenceId,
      },
    });

    return transaction;
  }

  async getTransactionSummary(userId: string) {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
      },
    });

    let totalCredit = 0;
    let totalDebit = 0;

    let success = 0;
    let failed = 0;
    let pending = 0;

    for (const transaction of transactions) {
      if (transaction.type === 'CREDIT') {
        totalCredit += Number(transaction.amount);
      }

      if (transaction.type === 'DEBIT') {
        totalDebit += Number(transaction.amount);
      }

      if (transaction.status === 'SUCCESS') {
        success++;
      }

      if (transaction.status === 'PROCESSING') {
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
    return this.prisma.transaction.findUnique({
      where: {
        referenceId,
      },
    });
  }

  async findTransactionByReference(referenceId: string) {
    const transaction = await this.prisma.transaction.findUnique({
      where: {
        referenceId,
      },
    });

    return transaction;
  }

  async findTransferTransactions(transferGroupId: string) {
    return this.prisma.transaction.findMany({
      where: {
        transferGroupId,
      },
    });
  }

  async getStatus(userId: string, referenceId: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: {
        userId,
        referenceId,
      },
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

  // async updateTransactionStatus(
  //   referenceId: string,
  //   status: TransactionStatus,
  // ) {
  //   const transaction = await this.prisma.transaction.update({
  //     where: {
  //       referenceId,
  //     },
  //     data: {
  //       status,
  //     },
  //   });

  //   if (!transaction) {
  //     throw new NotFoundException('Transaction not found');
  //   }

  //   return transaction;
  // }

  async markRollback(transferGroupId: string) {
    console.log('Rollback Group:', transferGroupId);

    const result = await this.prisma.transaction.updateMany({
      where: {
        transferGroupId,
        isRollback: false,
      },

      data: {
        isReversed: true,
      },
    });

    console.log(result);

    return result;
  }
}
