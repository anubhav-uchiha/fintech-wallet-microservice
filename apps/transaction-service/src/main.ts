import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { TransactionServiceModule } from './transaction-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    TransactionServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 3003,
      },
    },
  );

  await app.listen();

  console.log('Transaction Service Running on Port 3003');
}

bootstrap();
