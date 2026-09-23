import { Module } from '@nestjs/common';
import { DiagnosticsController } from './diagnostics.controller';
import { DiagnosticsService } from './diagnostics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MedicalReportsModule } from '../medical-reports/medical-reports.module';

@Module({
  imports: [PrismaModule, MedicalReportsModule],
  controllers: [DiagnosticsController],
  providers: [DiagnosticsService],
  exports: [DiagnosticsService],
})
export class DiagnosticsModule {}
