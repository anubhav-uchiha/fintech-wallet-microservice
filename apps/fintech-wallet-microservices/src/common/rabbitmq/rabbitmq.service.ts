import { Injectable, OnModuleInit } from '@nestjs/common';
// import {
//   ClientProxy,
//   ClientProxyFactory,
//   Transport,
// } from '@nestjs/microservices';
import * as amqp from 'amqplib';
// import { firstValueFrom } from 'rxjs';

@Injectable()
export class RabbitMQService implements OnModuleInit {
  // private client!: ClientProxy;
  private connection!: amqp.ChannelModel;
  private channel!: amqp.Channel;

  async onModuleInit() {
    this.connection = await amqp.connect('amqp://guest:guest@localhost:5672');

    this.channel = await this.connection.createChannel();
    await this.channel.assertExchange('fintech.events', 'topic', {
      durable: true,
    });
    // this.client = ClientProxyFactory.create({
    //   transport: Transport.RMQ,
    //   options: {
    //     urls: ['amqp://guest:guest@localhost:5672'],
    //     queue: 'transaction_queue',
    //     queueOptions: {
    //       durable: true,
    //     },
    //   },
    // });

    // await this.client.connect();

    console.log('✅ RabbitMQ Exchange Connected');
  }

  // async publish(pattern: string, data: any) {
  async publish(routingKey: string, data: any) {
    console.log('Publishing:', routingKey);
    console.log(data);
    this.channel.publish(
      'fintech.events',
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true },
    );
    // await firstValueFrom(this.client.emit(pattern, data));
  }

  // async send(pattern: string, data: any) {
  //   return await firstValueFrom(this.client.send(pattern, data));
  // }
}
