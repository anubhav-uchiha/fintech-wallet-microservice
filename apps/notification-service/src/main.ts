import { NestFactory } from '@nestjs/core';
import { Transport } from '@nestjs/microservices';
import { NotificationModule } from './notification-service.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);

  await app.listen(3006);

  console.log('Nortification Service Running');
}

bootstrap();
