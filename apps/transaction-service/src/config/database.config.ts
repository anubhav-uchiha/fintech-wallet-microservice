import { MongooseModule } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';

export const DatabaseModule = MongooseModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    uri: config.getOrThrow<string>('MONGO_URI'),
  }),
});
