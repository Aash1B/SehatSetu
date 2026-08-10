import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MchController } from './mch.controller';
import { MchService } from './mch.service';
import { MchProcessor } from './mch.processor';
import { MchOverdueWorker } from './mch.overdue-worker';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'mch-queue' }),
  ],
  controllers: [MchController],
  providers: [MchService, MchProcessor, MchOverdueWorker],
  exports: [MchService],
})
export class MchModule {}
