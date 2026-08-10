import { Module, forwardRef } from '@nestjs/common';
import { SagaService } from './saga.service';
import { SagaController } from './saga.controller';
import { WebhookController } from './webhook.controller';
import { AppointmentsModule } from '../appointments/appointments.module';
import { PaymentsModule } from '../payments/payments.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [forwardRef(() => QueueModule), AppointmentsModule, PaymentsModule],
  providers: [SagaService],
  controllers: [SagaController, WebhookController],
  exports: [SagaService],
})
export class SagaModule {}
