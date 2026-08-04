import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { EhrModule } from './ehr/ehr.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';
import { LivekitModule } from './livekit/livekit.module';
import { MailModule } from './mail/mail.module';
import { MedicalReportsModule } from './medical-reports/medical-reports.module';
import { PaymentsModule } from './payments/payments.module';
import { HospitalsModule } from './hospitals/hospitals.module';
import { EncryptionModule } from './encryption/encryption.module';
import { AbdmModule } from './abdm/abdm.module';
import { DoctorsModule } from './doctors/doctors.module';
import { QueueModule } from './queue/queue.module';
import { PatientModule } from './patient/patient.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    EncryptionModule,
    QueueModule,
    AuthModule,
    EhrModule,
    AppointmentsModule,
    AiModule,
    LivekitModule,
    MedicalReportsModule,
    PaymentsModule,
    HospitalsModule,
    AbdmModule,
    DoctorsModule,
    PatientModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}