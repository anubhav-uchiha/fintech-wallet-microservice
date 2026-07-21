import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';

import { WalletController } from './wallet.controller';
import { WalletGatewayService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
    }),

    ClientsModule.register([
      {
        name: 'WALLET_SERVICE',
        transport: Transport.TCP,
        options: {
          host: '127.0.0.1',
          port: 3002,
        },
      },
    ]),
  ],

  controllers: [WalletController],

  providers: [WalletGatewayService, JwtAuthGuard],

  exports: [WalletGatewayService],
})
export class WalletModule {}
