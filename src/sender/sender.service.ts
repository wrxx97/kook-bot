import { Injectable } from '@nestjs/common';

@Injectable()
export class SenderService {
  async send_message(data) {
    console.info(data);
  }
}
