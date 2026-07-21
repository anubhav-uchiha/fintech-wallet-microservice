import { Module } from '@nestjs/common';
import { NotificationController } from './notification-service.controller';
import { RabbitMQConsumer } from './rabbitmq.consumer';

@Module({
  controllers: [NotificationController],
  providers: [RabbitMQConsumer],
})
export class NotificationModule {}
