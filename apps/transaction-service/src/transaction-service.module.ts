import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { DatabaseModule } from './config/database.config';
import { TransactionModule } from './transaction/transaction.module';
import { RabbitMQConsumer } from './rabbitMQ.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    DatabaseModule,

    TransactionModule,
  ],
  providers: [RabbitMQConsumer],
})
export class TransactionServiceModule {}
