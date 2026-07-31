import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AiModule } from './ai/ai.module';
import { DoctorsModule } from './doctors/doctors.module';
import { PatientModule } from './patient/patient.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AppointmentsModule,
    AiModule,
    DoctorsModule,
    PatientModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
