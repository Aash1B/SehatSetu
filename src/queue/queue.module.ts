import { Module, Global, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppointmentProcessor } from './processors/appointment.processor';
import { ConsultationProcessor } from './processors/consultation.processor';
import { RecoveryProcessor } from './processors/recovery.processor';
import { SagaModule } from '../saga/saga.module';
import { MedicalReportsModule } from '../medical-reports/medical-reports.module';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          maxRetriesPerRequest: null,
        },
      }),
    }),
    BullModule.registerQueue(
      { name: 'appointment-queue' },
      { name: 'consultation-queue' },
      { name: 'recovery-queue' },
      { name: 'mch-queue' },
    ),
    forwardRef(() => SagaModule),
    MedicalReportsModule,
  ],
  providers: [
    AppointmentProcessor,
    ConsultationProcessor,
    RecoveryProcessor,
  ],
  exports: [
    BullModule,
    AppointmentProcessor,
    ConsultationProcessor,
    RecoveryProcessor,
  ],
})
export class QueueModule {}
