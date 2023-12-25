import { Controller } from '@nestjs/common';
import { SenderService } from './sender.service';

@Controller('sender')
export class SenderController {
  constructor(private readonly senderService: SenderService) {}
}
