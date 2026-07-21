import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import { WalletService } from './wallet.service';

import { TransferMoneyDto } from './dto/transfer-money.dto';
import { CallbackDto } from './dto/callback.dto';
import { AepsWithdrawDto } from './dto/aeps-withdraw.dto';
import { AepsBalanceDto } from './dto/aeps-balance.dto';
import { GetTransactionsDto } from 'apps/transaction-service/src/transaction/dto/get-transactions.dto';

@Controller()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @MessagePattern({ cmd: 'create_wallet' })
  createWallet(@Payload() data: { userId: string }) {
    return this.walletService.createWallet(data.userId);
  }

  @MessagePattern({ cmd: 'get_wallet' })
  getWallet(@Payload() data: { userId: string }) {
    return this.walletService.getWalletByUserId(data.userId);
  }

  @MessagePattern({ cmd: 'get_balance' })
  getBalance(@Payload() data: { userId: string }) {
    return this.walletService.getBalance(data.userId);
  }

  @MessagePattern({ cmd: 'add_money' })
  addMoney(@Payload() data: { userId: string; amount: number }) {
    return this.walletService.addMoney(data.userId, data.amount);
  }

  @MessagePattern({ cmd: 'withdraw_money' })
  withdraw(
    @Payload()
    data: {
      userId: string;
      amount: number;
    },
  ) {
    return this.walletService.withdraw(data.userId, data.amount);
  }

  @MessagePattern({ cmd: 'get_transactions' })
  getTransactions(
    @Payload()
    data: {
      userId: string;
      query: GetTransactionsDto;
    },
  ) {
    return this.walletService.getTransactions(data.userId, data.query);
  }

  @MessagePattern({ cmd: 'transfer_money' })
  transferMoney(
    @Payload()
    data: {
      userId: string;
      receiverEmail: string;
      amount: number;
    },
  ) {
    return this.walletService.transferMoney(data.userId, {
      receiverEmail: data.receiverEmail,
      amount: data.amount,
    });
  }

  @MessagePattern({ cmd: 'get_transaction_by_reference' })
  getTransactionByReference(
    @Payload()
    data: {
      userId: string;
      referenceId: string;
    },
  ) {
    return this.walletService.getTransactionByReference(
      data.userId,
      data.referenceId,
    );
  }

  @MessagePattern({ cmd: 'rollback_transaction' })
  rollbackTransaction(
    @Payload()
    data: {
      userId: string;
      referenceId: string;
    },
  ) {
    return this.walletService.rollbackTransaction(
      data.userId,
      data.referenceId,
    );
  }

  @MessagePattern({ cmd: 'get_transaction_status' })
  getTransactionStatus(
    @Payload()
    data: {
      userId: string;
      referenceId: string;
    },
  ) {
    return this.walletService.getTransactionStatus(
      data.userId,
      data.referenceId,
    );
  }

  @MessagePattern({ cmd: 'payment_callback' })
  paymentCallback(@Payload() dto: CallbackDto) {
    return this.walletService.paymentCallback(dto);
  }

  @MessagePattern({ cmd: 'aeps_withdraw' })
  aepsWithdraw(
    @Payload()
    data: {
      userId: string;
      amount: number;
      bankName: string;
      aadhaarNumber: string;
    },
  ) {
    return this.walletService.aepsWithdraw(data.userId, {
      amount: data.amount,
      bankName: data.bankName,
      aadhaarNumber: data.aadhaarNumber,
    });
  }

  @MessagePattern({ cmd: 'aeps_balance' })
  aepsBalance(
    @Payload()
    data: {
      userId: string;
      aadhaarNumber: string;
      bankName: string;
    },
  ) {
    return this.walletService.aepsBalance(data.userId, {
      aadhaarNumber: data.aadhaarNumber,
      bankName: data.bankName,
    });
  }
}
