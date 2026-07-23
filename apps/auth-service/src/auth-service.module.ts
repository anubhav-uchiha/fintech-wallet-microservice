import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthServiceController } from './auth-service.controller';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    RabbitMQModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'apps/auth-service/.env',
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AuthServiceController],
})
export class AuthServiceModule {}
