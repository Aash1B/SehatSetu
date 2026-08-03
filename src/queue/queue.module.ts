import { Module, Global } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppointmentProcessor } from './processors/appointment.processor';
import { ConsultationProcessor } from './processors/consultation.processor';

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
    ),
  ],
  providers: [
    AppointmentProcessor,
    ConsultationProcessor,
  ],
  exports: [
    BullModule,
    AppointmentProcessor,
    ConsultationProcessor,
  ],
})
export class QueueModule {}
