import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { TransactionServiceModule } from './transaction-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    TransactionServiceModule,
    {
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://guest:guest@localhost:5672'],
        queue: 'transaction_queue',

        noAck: false,

        queueOptions: {
          durable: true,
        },
      },
    },
  );

  await app.listen();

  console.log('Transaction Service Running on RabbitMQ');
}

bootstrap();
