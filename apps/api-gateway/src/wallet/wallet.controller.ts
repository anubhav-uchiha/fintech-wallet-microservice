import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { WalletGatewayService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';

import { AddMoneyDto } from 'apps/wallet-service/src/wallet/dto/add-money.dto';
import { WithdrawMoneyDto } from 'apps/wallet-service/src/wallet/dto/withdraw-money.dto';
import { TransferMoneyDto } from 'apps/wallet-service/src/wallet/dto/transfer-money.dto';
import { CallbackDto } from 'apps/wallet-service/src/wallet/dto/callback.dto';
import { AepsWithdrawDto } from 'apps/wallet-service/src/wallet/dto/aeps-withdraw.dto';
import { AepsBalanceDto } from 'apps/wallet-service/src/wallet/dto/aeps-balance.dto';
import { GetTransactionsDto } from 'apps/transaction-service/src/transaction/dto/get-transactions.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletGatewayService) {}

  @Post('create')
  createWallet(@Body() body: { userId: string }) {
    return this.walletService.createWallet(body.userId);
  }

  @Post('balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@Req() req: any) {
    return this.walletService.getBalance(req.user.userId);
  }

  @Post('add-money')
  @UseGuards(JwtAuthGuard)
  addMoney(@Req() req: any, @Body() dto: AddMoneyDto) {
    return this.walletService.addMoney(req.user.userId, dto.amount);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  withdraw(@Req() req: any, @Body() dto: WithdrawMoneyDto) {
    return this.walletService.withdraw(req.user.userId, dto.amount);
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  getTransactions(@Req() req: any, @Query() query: GetTransactionsDto) {
    return this.walletService.getTransactions(req.user.userId, query);
  }

  @Post('transfer')
  @UseGuards(JwtAuthGuard)
  transfer(@Req() req: any, @Body() dto: TransferMoneyDto) {
    return this.walletService.transferMoney(req.user.userId, dto);
  }

  @Get('transaction/:referenceId')
  @UseGuards(JwtAuthGuard)
  getTransaction(@Req() req: any, @Param('referenceId') referenceId: string) {
    return this.walletService.getTransactionByReference(
      req.user.userId,
      referenceId,
    );
  }

  @Post('rollback/:referenceId')
  @UseGuards(JwtAuthGuard)
  rollback(@Req() req: any, @Param('referenceId') referenceId: string) {
    return this.walletService.rollbackTransaction(req.user.userId, referenceId);
  }

  @Post('callback')
  paymentCallback(@Body() dto: CallbackDto) {
    return this.walletService.paymentCallback(dto);
  }

  @Post('aeps/withdraw')
  @UseGuards(JwtAuthGuard)
  aepsWithdraw(@Req() req: any, @Body() dto: AepsWithdrawDto) {
    return this.walletService.aepsWithdraw(req.user.userId, dto);
  }

  @Post('aeps/balance')
  @UseGuards(JwtAuthGuard)
  aepsBalance(@Req() req: any, @Body() dto: AepsBalanceDto) {
    return this.walletService.aepsBalance(req.user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getWallet(@Req() req: any) {
    return this.walletService.getWallet(req.user.userId);
  }
}
