import { Injectable, OnModuleInit } from '@nestjs/common';
import * as amqp from 'amqplib';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  private connection!: amqp.ChannelModel;
  private channel!: amqp.Channel;

  async onModuleInit() {
    this.connection = await amqp.connect('amqp://guest:guest@localhost:5672');

    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange('fintech.events', 'topic', {
      durable: true,
    });

    console.log('✅ RabbitMQ Exchange Connected');
  }

  async publish(routingKey: string, data: any) {
    console.log('Publishing:', routingKey);
    console.log(data);
    this.channel.publish(
      'fintech.events',
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true },
    );
  }
}
