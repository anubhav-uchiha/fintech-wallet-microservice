import { Injectable, OnModuleInit } from '@nestjs/common';
import { TransactionService } from './transaction/transaction.service';
import { Channel, connect, ConsumeMessage } from 'amqplib';

@Injectable()
export class RabbitMQConsumer implements OnModuleInit {
  constructor(private readonly transactionService: TransactionService) {}

  async onModuleInit() {
    const connection = await connect('amqp://guest:guest@localhost:5672');

    const channel: Channel = await connection.createChannel();
    await channel.assertExchange('fintech.events', 'topic', {
      durable: true,
    });

    await channel.assertQueue('transaction_queue', { durable: true });

    await channel.bindQueue(
      'transaction_queue',
      'fintech.events',
      'transaction.created',
    );

    await channel.bindQueue(
      'transaction_queue',
      'fintech.events',
      'transaction.rollback',
    );

    console.log(' Transaction Queue Connected');

    channel.consume(
      'transaction_queue',
      async (msg: ConsumeMessage | null) => {
        if (!msg) return;
        const event = msg.fields.routingKey;
        const data = JSON.parse(msg.content.toString());

        console.log('============== MESSAGE RECEIVED ===========');
        console.log('EVENT', event);
        console.log(data);

        try {
          switch (event) {
            case 'transaction.created':
              console.log('Creating transations....');
              await this.transactionService.createTransaction(data);
              break;
            case 'transaction.rollback':
              console.log('RollBack.....');
              await this.transactionService.markRollback(data);
              break;
            default:
              console.log('Unknown event:', event);
          }

          channel.ack(msg);
        } catch (error) {
          console.error(error);
          channel.nack(msg, false, false);
        }
      },
      {
        noAck: false,
      },
    );
  }
}
