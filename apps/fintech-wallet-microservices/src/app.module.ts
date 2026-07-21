import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../../auth-service/src/auth/auth.module';
import { UsersModule } from '../../auth-service/src/users/users.module';
import { WalletModule } from '../../wallet-service/src/wallet/wallet.module';
import { TransactionModule } from '../../transaction-service/src/transaction/transaction.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRoot(process.env.MONGO_URI!),
    AuthModule,
    UsersModule,
    WalletModule,
    TransactionModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
