import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TransactionModule } from './transaction/transaction.module';
import { RabbitMQConsumer } from './rabbitMQ.consumer';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/transaction-service/.env',
    }),

    PrismaModule,
    TransactionModule,
  ],
  providers: [RabbitMQConsumer],
})
export class TransactionServiceModule {}
