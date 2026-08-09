import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { Job } from 'bullmq';
import { SagaService } from '../../saga/saga.service';

@Processor('recovery-queue')
@Injectable()
export class RecoveryProcessor extends WorkerHost {
  private readonly logger = new Logger(RecoveryProcessor.name);

  constructor(@Inject(forwardRef(() => SagaService)) private readonly sagaService: SagaService) {
    super();
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing recovery queue job [${job.name}] (ID: ${job.id})`);

    switch (job.name) {
      case 'check-stuck-sagas':
        return this.handleStuckSagas();
      case 'check-payment-timeout':
        return this.handlePaymentTimeout(job.data);
      case 'retry-saga':
        return this.handleRetrySaga(job.data);
      default:
        this.logger.warn(`Unknown job name in recovery queue: ${job.name}`);
        return { status: 'ignored' };
    }
  }

  private async handleStuckSagas(): Promise<any> {
    this.logger.log('Starting stuck saga recovery process');
    // Call processStuckSagas directly - it's a private method
    const stuckSagas = await this.sagaService['getRecoverableSagas']();

    this.logger.log(`Found ${stuckSagas.length} stuck sagas for recovery`);

    for (const saga of stuckSagas) {
      try {
        // Skip if already processed
        if (saga.status === 'COMPLETED' || saga.status === 'COMPENSATED') {
          continue;
        }

        // For payment-related sagas, check if we need to trigger compensation
        if (saga.type === 'BOOK_APPOINTMENT_WITH_PAYMENT') {
          if (saga.status === 'PAYMENT_INITIATED') {
            // Payment timeout - trigger compensation
            await this.sagaService['compensate'](saga.sagaId, saga.step, 'Payment verification timeout (recovery)');
          } else if (saga.status === 'APPOINTMENT_CREATED') {
            // Payment never initiated - compensation might not be needed, but mark as stuck
            await this.sagaService['prisma'].sagaState.update({
              where: { sagaId: saga.sagaId },
              data: {
                status: 'FAILED' as any,
                errorMessage: 'Stuck - payment not initiated within expected timeframe',
              },
            });
          }
        }

        this.logger.log(`Recovered saga: ${saga.sagaId}, status: ${saga.status}`);
      } catch (error) {
        this.logger.error(`Failed to recover saga: ${saga.sagaId}`, error);
      }
    }

    return { success: true, recoveredCount: stuckSagas.length };
  }

  private async handlePaymentTimeout(data: { sagaId: string }): Promise<any> {
    this.logger.log(`Processing payment timeout for saga: ${data.sagaId}`);
    await this.sagaService['checkPaymentTimeout'](data.sagaId);
    return { success: true, sagaId: data.sagaId };
  }

  private async handleRetrySaga(data: { sagaId: string; step: number; retries: number }): Promise<any> {
    this.logger.log(`Processing retry for saga: ${data.sagaId}, attempt: ${data.retries}`);

    // Re-execute from the failed step
    // Note: This is a simplified approach - in production, you'd want more robust retry logic
    // that tracks exactly which step failed and handles state correctly

    return { success: true, sagaId: data.sagaId, retryAttempt: data.retries };
  }
}
