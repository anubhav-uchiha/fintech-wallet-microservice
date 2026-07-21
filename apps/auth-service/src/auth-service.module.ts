import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthServiceController } from './auth-service.controller';
import { DatabaseModule } from './config/database.config';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RabbitMQModule } from './common/rabbitmq/rabbitmq.module';

@Module({
  imports: [
    RabbitMQModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    DatabaseModule,
    UsersModule,
    AuthModule,
  ],
  controllers: [AuthServiceController],
})
export class AuthServiceModule {}
