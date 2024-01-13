import { HttpService } from '@nestjs/axios';
import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { AxiosError } from 'axios';
import { Queue } from 'bull';
import * as dayjs from 'dayjs';
import * as timezone from 'dayjs/plugin/timezone';
import * as utc from 'dayjs/plugin/utc';
import { catchError, firstValueFrom } from 'rxjs';
import { RedisService } from 'src/redis/redis.service';
import { ReplyService } from 'src/reply/reply.service';
import { KookMsgType, SendGroupMsg } from 'src/types/kook';
import { KookCommandType } from 'src/types/kook';

dayjs.extend(utc);
dayjs.extend(timezone);

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
      case KookCommandType.UNSUBSCRIBE:
        content += await this.replyService[command](target_id);
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

  async add_send_task() {
    const is_update = await this.replyService.activity_is_update();
    if (is_update) {
      const target_ids =
        (await this.redisService.get('subscribe_target_ids')) || '';
      const newId = typeof is_update === 'string' ? is_update : '';
      if (!target_ids) return;
      const target_ids_array = target_ids.split(',');
      for (const target_id of target_ids_array) {
        await this.autoSender.add(
          'message',
          {
            type: KookMsgType.CARD,
            target_id,
            content: await this.replyService.dn_activity('normal', newId),
          },
          {
            removeOnComplete: true,
          },
        );
      }
    }
  }

  @Cron('00 19 * * *', {
    timeZone: 'Asia/Shanghai',
  })
  async auto_add_send_task1() {
    await this.add_send_task();
  }

  @Cron('00 12,18,22 * * 3', {
    timeZone: 'Asia/Shanghai',
  })
  async auto_add_send_task2() {
    await this.add_send_task();
  }

  @Cron('01 00 * * *', {
    timeZone: 'Asia/Shanghai',
  })
  async auto_send_TodayActivity() {
    const date = dayjs().tz('Asia/Shanghai');
    const targetDate = dayjs('2024-01-24').tz('Asia/Shanghai');

    // 判断当前时间是否在指定日期之前
    const isBefore = date.isBefore(targetDate);
    if (!isBefore) return;

    const day = date.day();
    const list = [
      '开启 b 级佣兵箱子1个',
      '门派讨伐战',
      '拾取秋之宝石 3 个',
      '开启古代混沌纹章袋子',
      '丢弃初级力量果汁',
      '在线30分钟',
      '拾取古代纹样 30 个',
    ];
    const target_ids =
      (await this.redisService.get('subscribe_target_ids')) || '';
    if (!target_ids) return;
    const target_ids_array = target_ids.split(',');

    for (const target_id of target_ids_array) {
      await this.autoSender.add(
        'message',
        {
          target_id,
          content: list[day],
        },
        {
          removeOnComplete: true,
        },
      );
    }
  }
}
