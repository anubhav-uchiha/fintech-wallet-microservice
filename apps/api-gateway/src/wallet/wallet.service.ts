import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WalletGatewayService {
  constructor(
    @Inject('WALLET_SERVICE')
    private readonly walletClient: ClientProxy,
  ) {}

  createWallet(userId: string) {
    return firstValueFrom(
      this.walletClient.send({ cmd: 'create_wallet' }, { userId }),
    );
  }

  getWallet(userId: string) {
    return firstValueFrom(
      this.walletClient.send({ cmd: 'get_wallet' }, { userId }),
    );
  }

  getBalance(userId: string) {
    return firstValueFrom(
      this.walletClient.send({ cmd: 'get_balance' }, { userId }),
    );
  }

  addMoney(userId: string, amount: number) {
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'add_money' },
        {
          userId,
          amount,
        },
      ),
    );
  }

  withdraw(userId: string, amount: number) {
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'withdraw_money' },
        {
          userId,
          amount,
        },
      ),
    );
  }

  getTransactions(userId: string, query: any) {
    console.log('Wallelt Service called');
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'get_transactions' },
        {
          userId,
          query,
        },
      ),
    );
  }

  transferMoney(userId: string, dto: any) {
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'transfer_money' },
        {
          userId,
          ...dto,
        },
      ),
    );
  }

  getTransactionByReference(userId: string, referenceId: string) {
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'get_transaction_by_reference' },
        {
          userId,
          referenceId,
        },
      ),
    );
  }

  rollbackTransaction(userId: string, referenceId: string) {
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'rollback_transaction' },
        {
          userId,
          referenceId,
        },
      ),
    );
  }

  getTransactionStatus(userId: string, referenceId: string) {
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'transaction_status' },
        {
          userId,
          referenceId,
        },
      ),
    );
  }

  paymentCallback(dto: any) {
    return firstValueFrom(
      this.walletClient.send({ cmd: 'payment_callback' }, dto),
    );
  }

  aepsWithdraw(userId: string, dto: any) {
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'aeps_withdraw' },
        {
          userId,
          ...dto,
        },
      ),
    );
  }

  aepsBalance(userId: string, dto: any) {
    return firstValueFrom(
      this.walletClient.send(
        { cmd: 'aeps_balance' },
        {
          userId,
          ...dto,
        },
      ),
    );
  }
}
