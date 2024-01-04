import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ReplyModule } from 'src/reply/reply.module';
import { ReplyService } from 'src/reply/reply.service';

import { SenderController } from './sender.controller';
import { SenderProcessor } from './sender.processor';
import { SenderService } from './sender.service';

@Module({
  imports: [
    ReplyModule,
    BullModule.registerQueue({
      name: 'kook_auto_sender',
    }),
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: config.get('kook_bot').api.host,
        timeout: 10000,
        maxRedirects: 5,
        headers: {
          Authorization: `Bot ${config.get('kook_bot').token}`,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SenderController],
  providers: [SenderService, SenderProcessor, ReplyService],
  exports: [SenderService, ReplyService],
})
export class SenderModule {}
