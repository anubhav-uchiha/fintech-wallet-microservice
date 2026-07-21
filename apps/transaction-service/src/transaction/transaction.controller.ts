import { Controller } from '@nestjs/common';
import {
  Ctx,
  EventPattern,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { TransactionService } from './transaction.service';

@Controller()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @EventPattern('transaction.created')
  async handleTransactionCreated(
    @Payload() data: any,
    @Ctx() context: RmqContext,
  ) {
    console.log('📩 Transaction Event:', data);

    await this.transactionService.createTransaction(data);

    const channel = context.getChannelRef();
    const message = context.getMessage();

    channel.ack(message);
  }

  @MessagePattern({ cmd: 'get_transactions' })
  getTransactions(
    @Payload()
    data: {
      userId: string;
      query: any;
    },
  ) {
    return this.transactionService.getUserTransactions(data.userId, data.query);
  }

  @MessagePattern({ cmd: 'get_transaction_reference' })
  getTransactionReference(
    @Payload()
    data: {
      userId: string;
      referenceId: string;
    },
  ) {
    return this.transactionService.getTransactionByReference(
      data.userId,
      data.referenceId,
    );
  }

  // @MessagePattern({
  //   cmd: 'find_transaction_by_reference',
  // })
  // findTransactionByReference(@Payload() referenceId: string) {
  //   return this.transactionService.findTransactionByReference(referenceId);
  // }

  @MessagePattern({ cmd: 'find_transaction_by_reference' })
  findByReference(@Payload() referenceId: string) {
    return this.transactionService.findByReferenceId(referenceId);
  }

  @MessagePattern({
    cmd: 'find_transfer_transactions',
  })
  findTransferTransactions(@Payload() transferGroupId: string) {
    return this.transactionService.findTransferTransactions(transferGroupId);
  }

  @EventPattern('transaction.rollback')
  async rollback(
    @Payload() transferGroupId: string,
    @Ctx() context: RmqContext,
  ) {
    console.log('📩 Rollback Event:', transferGroupId);

    await this.transactionService.markRollback(transferGroupId);

    const channel = context.getChannelRef();
    const message = context.getMessage();

    channel.ack(message);
  }

  @MessagePattern({
    cmd: 'transaction_summary',
  })
  summary(
    @Payload()
    data: {
      userId: string;
    },
  ) {
    return this.transactionService.getTransactionSummary(data.userId);
  }

  @MessagePattern({
    cmd: 'transaction_status',
  })
  status(
    @Payload()
    data: any,
  ) {
    return this.transactionService.getStatus(data.userId, data.referenceId);
  }

  @MessagePattern({
    cmd: 'update_transaction_status',
  })
  updateStatus(@Payload() dto: any) {
    return this.transactionService.updateTransactionStatus(
      dto.referenceId,
      dto.status,
    );
  }
}
