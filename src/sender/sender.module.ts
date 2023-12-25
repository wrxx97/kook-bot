import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SenderService } from './sender.service';
import { SenderController } from './sender.controller';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    HttpModule.registerAsync({
      useFactory: (config: ConfigService) => ({
        baseURL: config.get('kook_bot').api.host,
        timeout: 10000,
        maxRedirects: 5,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [SenderController],
  providers: [SenderService],
})
export class SenderModule { }
