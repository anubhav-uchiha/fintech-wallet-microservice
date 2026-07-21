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
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { AddMoneyDto } from './dto/add-money.dto';
import { WithdrawMoneyDto } from './dto/withdraw-money.dto';
import { GetTransactionsDto } from 'src/transaction/dto/get-transactions.dto';
import { TransferMoneyDto } from './dto/transfer-money.dto';
import { CallbackDto } from './dto/callback.dto';
import { AepsWithdrawDto } from './dto/aeps-withdraw.dto';
import { AepsBalanceDto } from './dto/aeps-balance.dto';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMyWallet(@Req() req: any) {
    return this.walletService.getWalletByUserId(req.user.userId);
  }

  @Get('balance')
  @UseGuards(JwtAuthGuard)
  getBalance(@Req() req: any) {
    return this.walletService.getBalance(req.user.userId);
  }

  @Post('add-money')
  @UseGuards(JwtAuthGuard)
  addMoney(@Req() req: any, @Body() addMoneyDto: AddMoneyDto) {
    return this.walletService.addMoney(req.user.userId, addMoneyDto.amount);
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  withdraw(@Req() req: any, @Body() withdrawMoneyDto: WithdrawMoneyDto) {
    return this.walletService.withdraw(
      req.user.userId,
      withdrawMoneyDto.amount,
    );
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

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  getSummary(@Req() req: any) {
    return this.walletService.getSummary(req.user.userId);
  }

  @Patch('freeze')
  @UseGuards(JwtAuthGuard)
  freezeWallet(@Req() req: any) {
    return this.walletService.freezeWallet(req.user.userId);
  }

  @Patch('unfreeze')
  @UseGuards(JwtAuthGuard)
  unfreeze(@Req() req: any) {
    return this.walletService.unfreezeWallet(req.user.userId);
  }

  @Patch('close')
  @UseGuards(JwtAuthGuard)
  close(@Req() req: any) {
    return this.walletService.closeWallet(req.user.userId);
  }

  @Post('rollback/:referenceId')
  @UseGuards(JwtAuthGuard)
  rollback(@Req() req: any, @Param('referenceId') referenceId: string) {
    return this.walletService.rollbackTransaction(req.user.userId, referenceId);
  }

  @Get('transaction-status/:referenceId')
  @UseGuards(JwtAuthGuard)
  getTransactionStatus(
    @Req() req: any,
    @Param('referenceId') referenceId: string,
  ) {
    return this.walletService.getTransactionStatus(
      req.user.userId,
      referenceId,
    );
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
}
