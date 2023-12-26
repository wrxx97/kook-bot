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
    const request = await this.senderService.generate_message(job.data);
    await this.senderService.send_message(request);
    this.logger.debug('Transcoding completed');
    return {};
  }
}
