import { Module } from '@nestjs/common';
import { ReceiverService } from './receiver.service';
import { ReceiverController } from './receiver.controller';
import { BullModule } from '@nestjs/bull';
import { ReceiverProcessor } from './receiver.processor';
import { KookMessageDecryptService } from 'src/kook-message-decrypt/kook-message-decrypt.service';
import { SenderModule } from 'src/sender/sender.module';

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
export class ReceiverModule { }
