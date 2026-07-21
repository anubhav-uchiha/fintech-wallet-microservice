import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private client!: ClientProxy;

  async onModuleInit() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,
      options: {
        urls: ['amqp://guest:guest@localhost:5672'],
        queue: 'transaction_queue',
        queueOptions: {
          durable: true,
        },
      },
    });

    await this.client.connect();

    console.log('✅ RabbitMQ Connected');
  }

  async publish(pattern: string, data: any) {
    await firstValueFrom(this.client.emit(pattern, data));
  }

  async send(pattern: string, data: any) {
    return await firstValueFrom(this.client.send(pattern, data));
  }
}
