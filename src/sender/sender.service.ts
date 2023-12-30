import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ReplyService } from 'src/reply/reply.service';
import { KookMsgType, SendGroupMsg } from 'src/types/kook';
import { KookCommandType } from 'src/types/kook';
import { firstValueFrom, catchError } from 'rxjs';
import { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SenderService {
  @Inject(ReplyService)
  private readonly replyService: ReplyService;
  @Inject(HttpService)
  private readonly httpService: HttpService;
  @Inject(ConfigService)
  private readonly configService: ConfigService;

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
      default:
        break;
    }

    console.info({
      type,
      target_id,
      content,
      quote: command === KookCommandType.CHAT ? quote : null,
    });
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
    console.info(res.data);
    return res;
  }
}
