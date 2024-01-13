import { Controller, Get } from '@nestjs/common';

import { ReplyService } from './reply.service';

@Controller('reply')
export class ReplyController {
  constructor(private readonly replyService: ReplyService) {}

  @Get()
  async test() {
    return await this.replyService.analyze_activity('357194');
  }
}
