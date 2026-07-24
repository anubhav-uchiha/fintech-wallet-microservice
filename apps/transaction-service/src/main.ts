import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { TransactionServiceModule } from './transaction-service.module';

async function bootstrap() {
  const app = await NestFactory.create(TransactionServiceModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3003,
    },
  });

  await app.startAllMicroservices();

  await app.listen(3005);

  console.log('✅ Transaction Service TCP Running on Port 3003');
  console.log('✅ HTTP Server Running on Port 3005');
}

bootstrap();
