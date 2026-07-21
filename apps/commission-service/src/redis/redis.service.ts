import { Injectable, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit {
  private client!: RedisClientType;

  async onModuleInit() {
    this.client = createClient({
      url: 'redis://127.0.0.1:6379',
    });

    this.client.on('error', (err) => {
      console.error('Redis Error:', err);
    });

    await this.client.connect();

    console.log('✅ Redis Connected');
  }

  async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  async set(key: string, value: any, ttl = 3600) {
    await this.client.set(key, JSON.stringify(value), {
      EX: ttl,
    });
  }

  async del(key: string) {
    await this.client.del(key);
  }
}
