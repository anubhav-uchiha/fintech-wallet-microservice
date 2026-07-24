import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { RabbitMQModule } from 'apps/fintech-wallet-microservices/src/common/rabbitmq/rabbitmq.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'AUTH_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3001,
        },
      },
      {
        name: 'TRANSACTION_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3003,
        },
      },
      {
        name: 'COMMISSION_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3004,
        },
      },
    ]),
    PrismaModule,
    RabbitMQModule,
  ],

  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}
