import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommissionModule } from './commission/commission.module';
import { RedisModule } from './redis/redis.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/commission-service/.env',
    }),

    PrismaModule,
    RedisModule,
    CommissionModule,
  ],
})
export class CommissionServiceModule {}
