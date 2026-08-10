import { Controller, Post, Body, Get, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { SagaService } from './saga.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

export class CreateAppointmentWithPaymentDto {
  doctorId: string;
  scheduledAt: string;
  patientName: string;
  patientAge?: string;
  patientGender?: string;
  patientHeight?: string;
  patientWeight?: string;
  patientBloodGroup?: string;
  patientPhone: string;
  patientEmail: string;
  healthConcern?: string;
  symptoms?: string[];
  duration?: string;
  severity?: string;
  consultMode?: 'VIDEO' | 'CHAT' | 'IN_PERSON';
  urgency?: string;
  notes?: string;
  date?: string;
  timeSlot?: string;
  isFollowUp?: boolean;
  emailRemindersEnabled?: boolean;
  idempotencyKey?: string;
}

export class VerifyWebhookDto {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

@Controller('sagas')
export class SagaController {
  constructor(private readonly sagaService: SagaService) {}

  @Post('appointments/with-payment')
  @UseGuards(JwtAuthGuard)
  async createAppointmentWithPayment(
    @Body() dto: CreateAppointmentWithPaymentDto,
    @Req() req: any,
  ) {
    const patient = await this.sagaService['prisma'].patient.findUnique({
      where: { userId: req.user.userId },
    });

    if (!patient) {
      throw new BadRequestException('Patient not found');
    }

    return this.sagaService.startSaga(
      'BOOK_APPOINTMENT_WITH_PAYMENT',
      {
        ...dto,
        patientId: patient.id,
        sagaId: `saga_${Date.now()}`,
      },
      dto.idempotencyKey,
    );
  }

  @Get('recover')
  async recoverSagas() {
    return this.sagaService.getRecoverableSagas();
  }

  @Post('webhook/payment')
  async handlePaymentWebhook(@Body() dto: VerifyWebhookDto) {
    return this.sagaService.handleWebhook(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
    );
  }
}
