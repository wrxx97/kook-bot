import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { createClient } from 'redis';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: 'REDIS_CLIENT',
      async useFactory(config: ConfigService) {
        const client = createClient({
          socket: {
            host: config.get('redis').host,
            port: config.get('redis').port,
          },
        });
        await client.connect();
        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [RedisService],
})
export class RedisModule {
  //
}
