import { Module } from '@nestjs/common';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { AiService } from '../ai/ai.service';

@Module({
  controllers: [DoctorsController],
  providers: [DoctorsService, AiService],
  exports: [DoctorsService],
})
export class DoctorsModule {}
