import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { RabbitMQModule } from 'apps/fintech-wallet-microservices/src/common/rabbitmq/rabbitmq.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [RabbitMQModule, PrismaModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
