import { Body, Controller, HttpCode, Inject, Post } from '@nestjs/common';

import { ReceiverService } from './receiver.service';

@Controller('receiver')
export class ReceiverController {
  @Inject(ReceiverService)
  private readonly receiverService: ReceiverService;

  @Post('challenge')
  @HttpCode(200)
  async challenge(@Body() body) {
    return await this.receiverService.challenge(body);
  }
}
