import { Module } from '@nestjs/common';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { MedicalReportsModule } from '../medical-reports/medical-reports.module';

@Module({
  imports: [MedicalReportsModule],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
