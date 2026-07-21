import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { CommissionServiceModule } from './commission-service.module';

async function bootstrap() {
  const app = await NestFactory.createMicroservice(CommissionServiceModule, {
    transport: Transport.TCP,
    options: {
      host: '127.0.0.1',
      port: 3004,
    },
  });

  await app.listen();

  console.log('Commission Service Running on TCP 3004');
}

bootstrap();
