import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { KookMessageDecryptService } from 'src/kook-message-decrypt/kook-message-decrypt.service';
import { SenderModule } from 'src/sender/sender.module';

import { ReceiverController } from './receiver.controller';
import { ReceiverProcessor } from './receiver.processor';
import { ReceiverService } from './receiver.service';

@Module({
  imports: [
    SenderModule,
    BullModule.registerQueue({
      name: 'kook_receiver',
    }),
  ],
  controllers: [ReceiverController],
  providers: [ReceiverService, ReceiverProcessor, KookMessageDecryptService],
})
export class ReceiverModule {}
