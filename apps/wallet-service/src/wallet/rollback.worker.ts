import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron, CronExpression } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RollbackWorker implements OnModuleInit {
  constructor(
    @Inject('TRANSACTION_SERVICE')
    private readonly transactionClient: ClientProxy,

    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit() {
    console.log('RollbackWorker Started');
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async processRollbackTransactions() {
    console.log('Checking rollback pending transactions....');
    const transactions = await firstValueFrom(
      this.transactionClient.send({ cmd: 'rollback_pending_transactions' }, {}),
    );
    console.log('Pending Rollback:', transactions.length);

    if (!transactions.length) {
      return;
    }

    for (const transaction of transactions) {
      try {
        await this.processRollback(transaction);
      } catch (error) {
        console.log('Rollback Failed:', transaction.referenceId);
        console.log(error);
      }
    }
  }

  private async processRollback(transaction: any) {
    if (transaction.isRollback) {
      return;
    }
    console.log('Recovering Transaction:', transaction.referenceId);

    // ==========================================
    // Transfer Rollback
    // ==========================================
    if (transaction.transferGroupId) {
      console.log('Transfer rollback detected');

      const transferTransactions = await firstValueFrom(
        this.transactionClient.send(
          { cmd: 'find_transfer_transactions' },
          transaction.transferGroupId,
        ),
      );

      await this.rollbackTransfer(transaction.transferGroupId);

      return;
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: {
        id: transaction.walletId,
      },
    });

    if (!wallet) {
      throw new Error('Wallet not found');
    }
    // console.log('Wallet Found:', wallet.id);
    const rollbackAmount = Number(
      transaction.rollbackAmount ?? transaction.amount,
    );

    if (transaction.type === 'DEBIT') {
      console.log('Reversing Debit');

      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: rollbackAmount } },
      });
    } else {
      console.log('Reversing Credit');
      await this.prisma.wallet.update({
        where: { id: wallet.id },
        data: {
          balance: {
            decrement: rollbackAmount,
          },
        },
      });
    }

    await firstValueFrom(
      this.transactionClient.send(
        { cmd: 'transaction_rolled_back' },
        {
          referenceId: transaction.referenceId,
        },
      ),
    );
    console.log('Rollback Completed:', transaction.referenceId);
  }

  private async rollbackTransfer(transferGroupId: string) {
    console.log('Rolling back transfer:', transferGroupId);

    const transactions = await firstValueFrom(
      this.transactionClient.send(
        { cmd: 'find_transfer_transactions' },
        transferGroupId,
      ),
    );

    if (!transactions.length) {
      throw new Error('Transfer transactions not found');
    }

    const senderTxn = transactions.find(
      (t: any) => t.type === 'DEBIT' && t.description.startsWith('Transferred'),
    );

    const receiverTxn = transactions.find((t: any) => t.type === 'CREDIT');

    const commissionTxn = transactions.find(
      (t: any) => t.description === 'Transfer Commission',
    );

    if (!senderTxn || !receiverTxn) {
      throw new Error('Invalid transfer');
    }

    await this.prisma.$transaction(async (tx) => {
      // Refund sender
      await tx.wallet.update({
        where: {
          id: senderTxn.walletId,
        },
        data: {
          balance: {
            increment: Number(senderTxn.rollbackAmount),
          },
        },
      });

      // Remove money from receiver
      await tx.wallet.update({
        where: {
          id: receiverTxn.walletId,
        },
        data: {
          balance: {
            decrement: Number(receiverTxn.rollbackAmount),
          },
        },
      });

      // Commission refund
      if (commissionTxn) {
        await tx.wallet.update({
          where: {
            id: commissionTxn.walletId,
          },
          data: {
            balance: {
              increment: Number(commissionTxn.rollbackAmount),
            },
          },
        });
      }
    });

    for (const txn of transactions) {
      await firstValueFrom(
        this.transactionClient.send(
          { cmd: 'transaction_rolled_back' },
          {
            referenceId: txn.referenceId,
          },
        ),
      );
    }

    console.log('Transfer rollback completed');
  }
}
