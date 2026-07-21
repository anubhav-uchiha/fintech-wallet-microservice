import { Injectable } from '@nestjs/common';
import {
  ClientProxy,
  ClientProxyFactory,
  Transport,
} from '@nestjs/microservices';

@Injectable()
export class RabbitMQService {
  private client: ClientProxy;

  constructor() {
    this.client = ClientProxyFactory.create({
      transport: Transport.RMQ,

      options: {
        urls: ['amqp://localhost:5672'],

        queue: 'notification_queue',

        queueOptions: {
          durable: true,
        },
      },
    });
  }

  async publish(event: string, data: any) {
    this.client.emit(event, data);
  }
}
