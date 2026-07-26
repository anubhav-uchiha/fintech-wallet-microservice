import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { TransactionService } from './transaction.service';

@Controller()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

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

  @MessagePattern({ cmd: 'create_transaction' })
  createTransaction(@Payload() data: any) {
    return this.transactionService.createTransaction(data);
  }

  @MessagePattern({ cmd: 'find_by_idempotency_key' })
  findByIdempotencyKey(@Payload() key: string) {
    return this.transactionService.findByIdempotencyKey(key);
  }

  @MessagePattern({ cmd: 'transaction_processing' })
  markProcessing(@Payload() data: { referenceId: string; status: string }) {
    return this.transactionService.markProcessing(data.referenceId);
  }

  @MessagePattern({ cmd: 'transaction_success' })
  maekSuccess(@Payload() data: { referenceId: string; status: string }) {
    return this.transactionService.markSuccess(data.referenceId);
  }

  @MessagePattern({ cmd: 'transaction_rollback_pending' })
  markRollbackPending(
    @Payload() data: { referenceId: string; status: string },
  ) {
    return this.transactionService.markRollbackPending(data.referenceId);
  }

  @MessagePattern({ cmd: 'rollback_pending_transactions' })
  rollbackPendingTransactions() {
    return this.transactionService.getRollbackPendingTransactions();
  }

  @MessagePattern({ cmd: 'transaction_rolled_back' })
  markRolledBack(@Payload() data: { referenceId: string; status: string }) {
    return this.transactionService.markRolledBack(data.referenceId);
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

  //   @MessagePattern({
  //     cmd: 'update_transaction_status',
  //   })
  //   updateStatus(@Payload() dto: any) {
  //     return this.transactionService.updateTransactionStatus(
  //       dto.referenceId,
  //       dto.status,
  //     );
  //   }
}
