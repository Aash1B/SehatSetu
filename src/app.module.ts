import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { AiModule } from './ai/ai.module';
import { HealthController } from './health.controller';

@Module({
  imports: [AuthModule, AppointmentsModule, AiModule],
  controllers: [HealthController],
})
export class AppModule {}
