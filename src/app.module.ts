import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import config from './config/configuration';
import { KookMessageDecryptService } from './kook-message-decrypt/kook-message-decrypt.service';
import { ReceiverModule } from './receiver/receiver.module';
import { RedisModule } from './redis/redis.module';
import { SenderModule } from './sender/sender.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => {
        return {
          limiter: {
            // 每 30 秒最多处理 30 个任务
            max: 60,
            duration: 60 * 1000,
          },
          redis: {
            host: config.get('redis').host,
            port: config.get('redis').port,
            password: config.get('redis').pass,
          },
        };
      },
      inject: [ConfigService],
    }),
    ReceiverModule,
    SenderModule,
    RedisModule,
  ],
  controllers: [AppController],
  providers: [AppService, KookMessageDecryptService],
})
export class AppModule {}
