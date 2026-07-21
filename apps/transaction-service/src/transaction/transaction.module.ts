import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Transaction, TransactionSchema } from './transaction.schema';

import { TransactionService } from './transaction.service';
import { TransactionController } from './transaction.controller';
import { RabbitMQModule } from 'apps/fintech-wallet-microservices/src/common/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    RabbitMQModule,
    MongooseModule.forFeature([
      {
        name: Transaction.name,
        schema: TransactionSchema,
      },
    ]),
  ],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}
