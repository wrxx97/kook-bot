import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ReceiverModule } from './receiver/receiver.module';
import { SenderModule } from './sender/sender.module';
import config from '../config/configuration';
import { BullModule } from '@nestjs/bull';
import { KookMessageDecryptService } from './kook-message-decrypt/kook-message-decrypt.service';

@Module({
  imports: [
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
            max: 2,
            duration: 30 * 1000,
          },
          redis: {
            host: config.get('redis').host,
            port: config.get('redis').port,
          },
        };
      },
      inject: [ConfigService],
    }),
    ReceiverModule,
    SenderModule,
  ],
  controllers: [AppController],
  providers: [AppService, KookMessageDecryptService],
})
export class AppModule { }
