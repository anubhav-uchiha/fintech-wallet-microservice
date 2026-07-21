import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth/jwt-auth.guard';
import { TransactionService } from './transaction.service';

@Controller('transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getTransaction(@Param('id') id: string, @Req() req: any) {
    return this.transactionService.getTransactionById(id, req.user.userId);
  }
}
