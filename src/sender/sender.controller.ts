import { Controller, Get } from '@nestjs/common';

import { SenderService } from './sender.service';

@Controller('sender')
export class SenderController {
  constructor(private readonly senderService: SenderService) {}

  @Get()
  async test() {
    await this.senderService.auto_send_TodayActivity();
    return 'success';
  }
}
