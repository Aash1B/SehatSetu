import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { AppointmentsModule } from './appointments/appointments.module';

@Module({
  imports: [AuthModule, AppointmentsModule],
})
export class AppModule {}