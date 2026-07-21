import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { WalletServiceModule } from './wallet-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    WalletServiceModule,
    {
      transport: Transport.TCP,
      options: {
        host: '127.0.0.1',
        port: 3002,
      },
    },
  );

  await app.listen();

  console.log('Wallet Service Running on Port 3002');
}

bootstrap();
