import { Module } from '@nestjs/common';
import { EhrService } from './ehr.service';
import { EhrController } from './ehr.controller';

@Module({
  providers: [EhrService],
  controllers: [EhrController],
})
export class EhrModule {}