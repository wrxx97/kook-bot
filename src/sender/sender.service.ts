import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ReplyService } from 'src/reply/reply.service';
import { KookMsgType, SendGroupMsg } from 'src/types/kook';
import { KookCommandType } from 'src/types/kook';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { RedisService } from 'src/redis/redis.service';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class SenderService {
  constructor(@InjectQueue('kook_auto_sender') private autoSender: Queue) {}

  @Inject(ReplyService)
  private readonly replyService: ReplyService;
  @Inject(HttpService)
  private readonly httpService: HttpService;
  @Inject(ConfigService)
  private readonly configService: ConfigService;
  @Inject(RedisService)
  private readonly redisService: RedisService;

  async generate_message(data): Promise<SendGroupMsg> {
    const {
      message: { target_id, msg_id: quote, author_id },
      command,
      command_content,
    } = data;
    let content = `(met)${author_id}(met)`;
    let type = KookMsgType.KMARKDOWN;
    switch (command) {
      case KookCommandType.RANK:
        content += await this.replyService.dn_rank();
        break;
      case KookCommandType.CHAT:
        content += await this.replyService.chat(command_content);
        break;
      case KookCommandType.WEEK_ACTIVITY:
        type = KookMsgType.CARD;
        content = await this.replyService.dn_activity(command_content);
        break;
      case KookCommandType.SUBSCRIBE:
        content += await this.replyService.subscribe(target_id);
      default:
        break;
    }

    return {
      type,
      target_id,
      content,
      quote: command === KookCommandType.CHAT ? quote : null,
    };
  }

  async send_message(request: SendGroupMsg) {
    const res = await firstValueFrom(
      this.httpService
        .post(
          this.configService.get('kook_bot').api.routes.send_group_message,
          request,
        )
        .pipe(
          catchError((error: AxiosError) => {
            console.error(error);
            throw 'An error happened!';
          }),
        ),
    );
    return res;
  }

  @Cron('00 19 * * *')
  async auto_add_send_task() {
    const is_update = await this.replyService.activity_is_update();
    if (is_update) {
      const target_ids = await this.redisService.get('subscribe_target_ids');
      const target_ids_array = target_ids.split(',');
      for (const target_id of target_ids_array) {
        await this.autoSender.add(
          'message',
          {
            type: KookMsgType.CARD,
            target_id,
            content: await this.replyService.dn_activity('normal'),
          },
          {
            removeOnComplete: true,
          },
        );
      }
    }
  }
}
