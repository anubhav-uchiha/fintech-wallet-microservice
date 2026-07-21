import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthServiceController } from './auth-service.controller';
import { DatabaseModule } from './config/database.config';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
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
