import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Commission, CommissionSchema } from './commission.schema';
import { CommissionController } from './commission.controller';
import { CommissionService } from './commission.service';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [
    RedisModule,
    MongooseModule.forFeature([
      {
        name: Commission.name,
        schema: CommissionSchema,
      },
    ]),
  ],
  controllers: [CommissionController],
  providers: [CommissionService],
  exports: [CommissionService],
})
export class CommissionModule {}
