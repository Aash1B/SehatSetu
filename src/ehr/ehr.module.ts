import { Module } from '@nestjs/common';
import { EhrService } from './ehr.service';
import { EhrParserService } from './ehr-parser.service';
import { EhrController } from './ehr.controller';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  providers: [EhrService, EhrParserService],
  controllers: [EhrController],
  exports: [EhrService, EhrParserService],
})
export class EhrModule {}