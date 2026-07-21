import { Injectable, OnModuleInit } from '@nestjs/common';
import { connect, Channel, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
  async onModuleInit() {
    const connection = await connect('amqp://guest:guest@localhost:5672');

    const channel: Channel = await connection.createChannel();

    await channel.assertExchange('fintech.events', 'topic', {
      durable: true,
    });

    await channel.assertQueue('notification_queue', {
      durable: true,
    });

    await channel.bindQueue('notification_queue', 'fintech.events', '#');

    console.log('✅ Notification Queue Connected');

    channel.consume(
      'notification_queue',
      (msg: ConsumeMessage | null) => {
        if (!msg) return;

        const event = msg.fields.routingKey;
        const data = JSON.parse(msg.content.toString());

        console.log('\n==============================');
        console.log('EVENT:', event);
        console.log(data);
        console.log('==============================\n');

        channel.ack(msg);
      },
      {
        noAck: false,
      },
    );
  }
}
