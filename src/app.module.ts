import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { EhrModule } from './ehr/ehr.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';
import { MailModule } from './mail/mail.module';
import { MedicalReportsModule } from './medical-reports/medical-reports.module';

@Module({
  imports: [PrismaModule, MailModule, AuthModule, EhrModule, AppointmentsModule, AiModule, MedicalReportsModule],
  controllers: [HealthController],
})
export class AppModule {}