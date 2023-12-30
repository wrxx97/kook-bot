import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SenderService } from './sender.service';
import { SenderController } from './sender.controller';
import { ConfigService } from '@nestjs/config';
import { ReplyService } from 'src/reply/reply.service';
import { ReplyModule } from 'src/reply/reply.module';
import { BullModule } from '@nestjs/bull';
import { SenderProcessor } from './sender.processor';

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
