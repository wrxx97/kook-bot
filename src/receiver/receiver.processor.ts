import { Process, Processor } from '@nestjs/bull';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bull';
import { SenderService } from 'src/sender/sender.service';

@Processor('kook_receiver')
export class ReceiverProcessor {
  private readonly logger = new Logger(ReceiverProcessor.name);

  @Inject(SenderService)
  private readonly senderService: SenderService;

  @Process('message')
  async handleTranscode(job: Job) {
    this.logger.debug('Start transcoding...');
    this.logger.debug(job.data);
    await this.senderService.send_message(job.data);
    this.logger.debug('Transcoding completed');

    return {};
  }
}
