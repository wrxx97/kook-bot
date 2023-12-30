import { InjectQueue } from '@nestjs/bull';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bull';
import { get } from 'lodash';
import { KookMessageDecryptService } from 'src/kook-message-decrypt/kook-message-decrypt.service';

@Injectable()
export class ReceiverService {
  constructor(@InjectQueue('kook_receiver') private kReceiver: Queue) {}

  @Inject(KookMessageDecryptService)
  private readonly kMessageDecryptService: KookMessageDecryptService;

  async challenge(body) {
    const encrypt: string = get(body, 'encrypt', '');
    // 消息解码
    const data = this.kMessageDecryptService.decrypt_message(encrypt);

    const message = get(data, 'd', { challenge: '' });
    const { challenge, msg_id } = message;
    if (!msg_id) return { challenge };

    const jobs = await this.kReceiver.getJobs([
      'completed',
      'waiting',
      'active',
      'delayed',
      'failed',
      'paused',
    ]);

    if (jobs.some((i) => i.data.message.msg_id === msg_id)) {
      // 已存在的任务不再处理
      return { challenge };
    }

    // 不回复机器人的消息
    const is_bot = get(message, 'extra.author.bot');
    if (is_bot === true) {
      return { challenge };
    }

    const clean_message =
      this.kMessageDecryptService.clean_kook_message(message);
    if (clean_message) {
      await this.kReceiver.add('message', clean_message, {
        removeOnComplete: true,
      });
    }

    return { challenge };
  }
}
