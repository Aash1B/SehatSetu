import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';
import { MedicalReportsModule } from './medical-reports/medical-reports.module';

@Module({
  imports: [AuthModule, AppointmentsModule, AiModule, MedicalReportsModule],
  controllers: [HealthController],
})
export class AppModule {}
