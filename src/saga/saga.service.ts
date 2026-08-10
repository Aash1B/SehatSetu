import { Injectable, BadRequestException, ConflictException, NotFoundException, InternalServerErrorException, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job, Worker } from 'bullmq';
import { createHmac } from 'crypto';

export type SagaType = 'BOOK_APPOINTMENT_WITH_PAYMENT' | 'RESCHEDULE_APPOINTMENT' | 'CANCEL_APPOINTMENT';
export type SagaStatus = 'STARTED' | 'APPOINTMENT_CREATED' | 'PAYMENT_INITIATED' | 'PAYMENT_VERIFIED' | 'RETRY_SCHEDULED' | 'COMPLETED' | 'FAILED' | 'COMPENSATED';

export interface SagaStep {
  name: string;
  execute: (data: any) => Promise<void>;
  compensate?: (data: any) => Promise<void>;
}

@Injectable()
export class SagaService implements OnModuleInit {
  private readonly logger = new Logger(SagaService.name);

  private readonly STEPS: Record<SagaType, SagaStep[]> = {
    BOOK_APPOINTMENT_WITH_PAYMENT: [
      {
        name: 'createAppointment',
        execute: async (data: any) => this.createAppointment(data),
        compensate: async (data: any) => this.compensateCancelAppointment(data),
      },
      {
        name: 'createPayment',
        execute: async (data: any) => this.createPayment(data),
        compensate: async (data: any) => this.compensateCancelPayment(data),
      },
      {
        name: 'waitPaymentVerification',
        execute: async (data: any) => {}, // Webhook handles this
      },
      {
        name: 'confirmAppointment',
        execute: async (data: any) => this.confirmAppointment(data),
      },
    ],
    RESCHEDULE_APPOINTMENT: [],
    CANCEL_APPOINTMENT: [],
  };

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('appointment-queue') private readonly appointmentQueue: Queue,
  ) {}

  async onModuleInit() {
    // Start recovery worker to handle stuck sagas
    this.startRecoveryWorker();
  }

  private startRecoveryWorker() {
    const recoveryWorker = new Worker('recovery-queue', async (job) => {
      this.logger.log(`Recovery worker processing job: ${job.name}`);

      if (job.name === 'check-stuck-sagas') {
        await this.processStuckSagas();
      } else if (job.name === 'check-payment-timeout') {
        await this.checkPaymentTimeout(job.data.sagaId);
      }

      return { success: true };
    }, {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
      },
    });

    recoveryWorker.on('completed', (job) => {
      this.logger.log(`Recovery job completed: ${job.id}`);
    });

    recoveryWorker.on('failed', (job, err) => {
      this.logger.error(`Recovery job failed: ${job?.id || 'unknown'}`, err);
    });
  }

  async startSaga(
    type: SagaType,
    data: any,
    idempotencyKey?: string,
  ): Promise<{ sagaId: string; status: SagaStatus }> {
    // Check for duplicate idempotency key
    if (idempotencyKey) {
      const existing = await this.prisma.sagaState.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return { sagaId: existing.sagaId, status: existing.status as SagaStatus };
      }
    }

    const sagaId = `saga_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const saga = await this.prisma.sagaState.create({
      data: {
        sagaId,
        type,
        status: 'STARTED',
        step: 0,
        idempotencyKey: idempotencyKey || null,
      },
    });

    // Execute steps
    const steps = this.STEPS[type];
    if (!steps) {
      throw new BadRequestException(`Unknown saga type: ${type}`);
    }

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      try {
        await step.execute(data);
        await this.prisma.sagaState.update({
          where: { sagaId },
          data: {
            status: this.mapStepToStatus(i + 1),
            step: i + 1,
          },
        });

        // Schedule payment timeout for PAYMENT_INITIATED step
        if (step.name === 'createPayment') {
          await this.schedulePaymentTimeout(sagaId);
        }
      } catch (error) {
        await this.compensate(sagaId, i, error.message);
        throw error;
      }
    }

    await this.prisma.sagaState.update({
      where: { sagaId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return { sagaId, status: 'COMPLETED' };
  }

  private async schedulePaymentTimeout(sagaId: string): Promise<void> {
    // Schedule a job to check for payment timeout after 15 minutes
    try {
      await this.appointmentQueue.add('check-payment-timeout', {
        sagaId,
        checkedAt: new Date().toISOString(),
      }, {
        delay: 15 * 60 * 1000, // 15 minutes in milliseconds
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        priority: 10, // Low priority for timeout checks
      });

      this.logger.log(`Scheduled payment timeout check for saga: ${sagaId}`);
    } catch (error) {
      this.logger.error(`Failed to schedule payment timeout for saga: ${sagaId}`, error);
    }
  }

  // Helper to map step index to status for BOOK_APPOINTMENT_WITH_PAYMENT
  private mapStepToStatus(step: number): SagaStatus {
    const statusMap: Record<number, SagaStatus> = {
      0: 'STARTED',
      1: 'APPOINTMENT_CREATED',
      2: 'PAYMENT_INITIATED',
      3: 'PAYMENT_VERIFIED',
      4: 'RETRY_SCHEDULED',
      5: 'COMPLETED',
    };
    return statusMap[step] || 'STARTED';
  }

  private async checkPaymentTimeout(sagaId: string): Promise<void> {
    const saga = await this.prisma.sagaState.findUnique({ where: { sagaId } });

    if (!saga) return;

    // If saga is already completed or compensated, do nothing
    if (saga.status === 'COMPLETED' || saga.status === 'COMPENSATED') {
      this.logger.log(`Saga ${sagaId} already completed/compensated, skipping timeout check`);
      return;
    }

    // Check if we're at PAYMENT_INITIATED status for more than 15 minutes
    if (saga.status === 'PAYMENT_INITIATED' && saga.paymentId) {
      const timeElapsed = Date.now() - new Date(saga.createdAt).getTime();
      const fifteenMinutes = 15 * 60 * 1000;

      if (timeElapsed > fifteenMinutes) {
        // Additional safety check: verify payment hasn't been captured
        const payment = await this.prisma.payment.findUnique({
          where: { id: saga.paymentId },
        });

        if (payment?.status === 'PAID' || payment?.status === 'REFUNDED') {
          this.logger.log(`Payment ${payment.id} already captured for saga ${sagaId}, skipping timeout compensation`);
          return;
        }

        this.logger.log(`Payment timeout for saga: ${sagaId}, starting compensation`);
        await this.compensate(sagaId, saga.step, 'Payment verification timeout');
      }
    }
  }

  async compensate(sagaId: string, failedStep: number, errorMessage?: string) {
    const saga = await this.prisma.sagaState.findUnique({ where: { sagaId } });
    if (!saga) return;

    const steps = this.STEPS[saga.type as SagaType];
    if (!steps) return;

    // Prevent duplicate compensation
    if (saga.status === 'COMPENSATED') {
      this.logger.log(`Saga ${sagaId} already compensated, skipping`);
      return;
    }

    // Compensate in reverse order (from failed step - 1 down to 0)
    for (let i = failedStep - 1; i >= 0; i--) {
      const step = steps[i];
      if (step.compensate) {
        try {
          await step.compensate({ saga });
        } catch (compensationError) {
          this.logger.error(`Compensation failed for step ${step.name}:`, compensationError);
        }
      }
    }

    await this.prisma.sagaState.update({
      where: { sagaId },
      data: {
        status: 'COMPENSATED',
        errorMessage,
        completedAt: new Date(),
      },
    });
  }

  private async createAppointment(data: any): Promise<void> {
    const appointment = await this.prisma.appointment.create({
      data: {
        patientId: data.patientId,
        doctorId: data.doctorId,
        scheduledAt: data.scheduledAt,
        status: 'SCHEDULED',
        patientName: data.patientName,
        patientAge: data.patientAge,
        patientGender: data.patientGender,
        patientHeight: data.patientHeight,
        patientWeight: data.patientWeight,
        patientBloodGroup: data.patientBloodGroup,
        patientPhone: data.patientPhone,
        patientEmail: data.patientEmail,
        healthConcern: data.healthConcern,
        symptoms: data.symptoms || [],
        duration: data.duration,
        severity: data.severity,
        consultMode: data.consultMode || 'VIDEO',
        urgency: data.urgency || 'ROUTINE',
        notes: data.notes,
        date: data.date,
        timeSlot: data.timeSlot,
        priority: 'ROUTINE',
        isFollowUp: Boolean(data.isFollowUp),
        emailRemindersEnabled: data.emailRemindersEnabled !== false,
      },
    });
    await this.prisma.sagaState.update({
      where: { sagaId: data.sagaId },
      data: { appointmentId: appointment.id },
    });
  }

  private async compensateCancelAppointment(data: any): Promise<void> {
    const { saga } = data;
    if (!saga?.appointmentId) return;

    // Cancel the appointment
    await this.prisma.appointment.update({
      where: { id: saga.appointmentId },
      data: { status: 'CANCELLED' },
    });

    // Release slot (no-op since status change allows booking)
  }

  private async createPayment(data: any): Promise<void> {
    const doctor = await this.prisma.doctor.findUnique({
      where: { id: data.doctorId },
    });

    const amountInPaise = (doctor?.consultationFee ?? 500) * 100;

    const Razorpay = require('razorpay');
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `saga_${data.sagaId.slice(0, 8)}_${Date.now()}`,
    });

    const payment = await this.prisma.payment.create({
      data: {
        patientId: data.patientId,
        appointmentId: data.appointmentId,
        razorpayOrderId: order.id,
        amount: amountInPaise,
        status: 'PENDING',
      },
    });

    await this.prisma.sagaState.update({
      where: { sagaId: data.sagaId },
      data: { paymentId: payment.id },
    });
  }

  private async compensateCancelPayment(data: any): Promise<void> {
    const { saga } = data;
    if (!saga?.paymentId) return;

    // Check if we need to refund
    const payment = await this.prisma.payment.findUnique({
      where: { id: saga.paymentId },
    });

    if (!payment) {
      this.logger.log(`Payment ${saga.paymentId} not found for compensation`);
      return;
    }

    // Prevent duplicate refund processing
    if (payment.status === 'REFUNDED' || payment.status === 'REFUND_FAILED') {
      this.logger.log(`Payment ${saga.paymentId} already processed for refund, skipping`);
      return;
    }

    if (!payment.razorpayOrderId) {
      // No razorpay order ID - just mark as failed
      await this.prisma.payment.update({
        where: { id: saga.paymentId },
        data: { status: 'FAILED' },
      });
      return;
    }

    try {
      // Check if payment was actually captured (not pending)
      // Razorpay's payment object has a 'captured' field when fetched
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID as string,
        key_secret: process.env.RAZORPAY_KEY_SECRET as string,
      });

      // Fetch payment details to check if it was captured
      const paymentDetails = await razorpay.payments.fetch(payment.razorpayOrderId);

      if (!paymentDetails.captured) {
        this.logger.log(`Payment ${payment.razorpayOrderId} was not captured, skipping refund`);
        // Payment was never captured, just mark as failed
        await this.prisma.payment.update({
          where: { id: saga.paymentId },
          data: { status: 'FAILED' },
        });
        return;
      }

      // Create refund for captured payment
      const refund = await razorpay.payments.refund(payment.razorpayOrderId, {
        amount: payment.amount,
        speed: 'normal',
      });

      // Update payment status based on refund
      // Store refundId if available for idempotency
      await this.prisma.payment.update({
        where: { id: saga.paymentId },
        data: {
          status: 'REFUNDED' as any,
          refundId: refund.id || undefined,
        },
      });

      this.logger.log(`Refund processed for payment ${saga.paymentId}, amount: ${payment.amount}, refundId: ${refund.id}`);
    } catch (refundError) {
      this.logger.error(`Refund failed for payment ${saga.paymentId}:`, refundError);

      // Update to failed status but don't throw - compensation should continue
      await this.prisma.payment.update({
        where: { id: saga.paymentId },
        data: {
          status: 'REFUND_FAILED' as any,
          errorMessage: refundError.message || undefined,
        },
      });
    }
  }

  private async confirmAppointment(data: any): Promise<void> {
    // This is typically done via webhook
    // But if called directly, update appointment status
    const { saga } = data;
    if (!saga?.appointmentId) return;

    await this.prisma.appointment.update({
      where: { id: saga.appointmentId },
      data: { status: 'SCHEDULED' },
    });
  }

  private getNextStatus(type: SagaType, step: number): SagaStatus {
    const statusMap: Record<string, SagaStatus[]> = {
      BOOK_APPOINTMENT_WITH_PAYMENT: [
        'STARTED',
        'APPOINTMENT_CREATED',
        'PAYMENT_INITIATED',
        'PAYMENT_VERIFIED',
        'COMPLETED',
      ],
    };
    return statusMap[type]?.[step] || 'STARTED';
  }

  async handleWebhook(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<{ sagaId: string; status: SagaStatus }> {
    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId },
      include: { appointment: true },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Verify Razorpay signature
    const crypto = require('crypto');
    const expectedSignature = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      throw new BadRequestException('Invalid signature');
    }

    // Update payment status
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID' },
    });

    // Find related saga and confirm appointment
    const saga = await this.prisma.sagaState.findFirst({
      where: { paymentId: payment.id },
    });

    if (saga) {
      await this.prisma.sagaState.update({
        where: { sagaId: saga.sagaId },
        data: {
          status: 'PAYMENT_VERIFIED',
          step: 3,
        },
      });

      // Confirm appointment
      await this.prisma.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'SCHEDULED' },
      });

      await this.prisma.sagaState.update({
        where: { sagaId: saga.sagaId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });

      return { sagaId: saga.sagaId, status: 'COMPLETED' };
    }

    // No saga found - this is a valid payment for an existing appointment
    return { sagaId: '', status: 'COMPLETED' };
  }

  async retrySaga(sagaId: string): Promise<{ sagaId: string; status: SagaStatus }> {
    const saga = await this.prisma.sagaState.findUnique({ where: { sagaId } });
    if (!saga) {
      throw new NotFoundException('Saga not found');
    }

    if (saga.status === 'COMPLETED' || saga.status === 'FAILED' || saga.status === 'COMPENSATED') {
      throw new BadRequestException('Cannot retry completed, failed, or compensated saga');
    }

    const maxRetries = 3;
    if (saga.retries >= maxRetries) {
      // Max retries exceeded - mark as failed
      await this.prisma.sagaState.update({
        where: { sagaId },
        data: {
          status: 'FAILED',
          errorMessage: `Maximum retries (${maxRetries}) exceeded`,
        },
      });
      throw new BadRequestException(`Maximum retries (${maxRetries}) exceeded`);
    }

    // Check if current step has a retryable error
    const errorMessage = saga.errorMessage || '';
    const isRetryable = this.isRetryableError(errorMessage);

    if (!isRetryable) {
      throw new BadRequestException('Cannot retry this saga - non-retryable error');
    }

    // Calculate exponential backoff delay (base 5s * 2^retries)
    const baseDelay = 5000;
    const backoffDelay = baseDelay * Math.pow(2, saga.retries);
    const maxDelay = 60000; // 1 minute max
    const delay = Math.min(backoffDelay, maxDelay);

    // Store retry attempt info
    await this.prisma.sagaState.update({
      where: { sagaId },
      data: {
        retries: saga.retries + 1,
        status: 'RETRY_SCHEDULED' as any, // Mark as retry scheduled
      },
    });

    // Add to recovery queue with delay for actual retry execution
    try {
      await this.appointmentQueue.add('retry-saga', {
        sagaId,
        step: saga.step,
        retries: saga.retries + 1,
        retryAt: new Date(Date.now() + delay).toISOString(),
      }, {
        delay,
        attempts: 1,
        removeOnComplete: true,
        priority: 1, // Higher priority for retries
      });

      this.logger.log(`Scheduled retry for saga: ${sagaId}, delay: ${delay}ms, attempt: ${saga.retries + 1}`);

      return { sagaId, status: 'RETRY_SCHEDULED' as any };
    } catch (queueError) {
      // If queue fails, revert retry count
      await this.prisma.sagaState.update({
        where: { sagaId },
        data: {
          retries: saga.retries,
          status: 'FAILED',
        },
      });
      throw new InternalServerErrorException('Failed to schedule retry');
    }
  }

  private isRetryableError(errorMessage?: string): boolean {
    if (!errorMessage) return false;

    const retryableErrors = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'ECONNRESET',
      'EHOSTUNREACH',
      'Network error',
      'Database connection',
      'Redis connection',
      'Rate limit',
      'timeout',
      'temporary',
    ];

    const lowerError = errorMessage.toLowerCase();
    return retryableErrors.some(err => lowerError.includes(err));
  }

  async getRecoverableSagas(): Promise<any[]> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    return this.prisma.sagaState.findMany({
      where: {
        OR: [
          // Stuck sagas older than 1 hour
          {
            status: {
              in: ['STARTED', 'APPOINTMENT_CREATED', 'PAYMENT_INITIATED', 'PAYMENT_VERIFIED'],
            },
            createdAt: {
              lt: oneHourAgo,
            },
          },
          // Sagas with maximum retries reached but not compensated
          {
            retries: 3,
            status: {
              in: ['STARTED', 'APPOINTMENT_CREATED'],
            },
          },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  private async processStuckSagas(): Promise<void> {
    const stuckSagas = await this.getRecoverableSagas();

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
            await this.compensate(saga.sagaId, saga.step, 'Payment verification timeout (recovery)');
          } else if (saga.status === 'APPOINTMENT_CREATED') {
            // Payment never initiated - compensation might not be needed, but mark as stuck
            await this.prisma.sagaState.update({
              where: { sagaId: saga.sagaId },
              data: {
                status: 'FAILED',
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
  }

  async verifySagaIdempotency(idempotencyKey: string): Promise<boolean> {
    const existing = await this.prisma.sagaState.findUnique({
      where: { idempotencyKey },
    });
    return existing === null;
  }
}
