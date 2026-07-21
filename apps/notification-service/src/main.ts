import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { NotificationModule } from './notification-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(NotificationModule, {
    transport: Transport.RMQ,

    options: {
      urls: ['amqp://localhost:5672'],

      queue: 'transaction_queue',

      queueOptions: {
        durable: true,
      },
    },
  });

  await app.listen();
}

bootstrap();
