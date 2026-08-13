import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import Razorpay = require('razorpay');
import { PrismaService } from '../prisma/prisma.service';

interface PaymentReceipt {
  receiptNumber: string;
  appointmentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string;
}

@Injectable()
export class PaymentsService {
  private razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID as string,
    key_secret: process.env.RAZORPAY_KEY_SECRET as string,
  });

  constructor(private readonly prisma: PrismaService) {}

  async createOrder(appointmentId: string, requestingUserId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId: requestingUserId } });
    if (!patient) {
      throw new ForbiddenException('Only patients can initiate payments');
    }

    const appointment = await this.prisma.appointment.findUnique({ where: { id: appointmentId } });
    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('This appointment does not belong to you');
    }

    const doctor = await this.prisma.doctor.findUnique({ where: { id: appointment.doctorId } });
    if (!doctor) {
      throw new NotFoundException('Doctor not found for this appointment');
    }
    const amountInPaise = Math.round(Number(doctor.consultationFee ?? 500) * 100);
    if (!Number.isFinite(amountInPaise) || amountInPaise <= 0) {
      throw new BadRequestException('The doctor consultation fee is invalid');
    }

    const existingPayment = await this.prisma.payment.findUnique({ where: { appointmentId } });
    if (existingPayment && existingPayment.status === 'PAID') {
      throw new BadRequestException('This appointment has already been paid for');
    }

    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `appt_${appointmentId.slice(0, 8)}_${Date.now()}`,
    });

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { appointmentId },
        data: {
          razorpayOrderId: order.id,
          amount: amountInPaise,
          currency: 'INR',
          status: 'PENDING',
          errorMessage: null,
        },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          patientId: patient.id,
          appointmentId,
          razorpayOrderId: order.id,
          amount: amountInPaise,
          currency: 'INR',
          status: 'PENDING',
        },
      });
    }

    return {
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
    };
  }

  async verifyPayment(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    requestingUserId: string,
  ): Promise<PaymentReceipt> {
    const patient = await this.prisma.patient.findUnique({ where: { userId: requestingUserId } });
    if (!patient) {
      throw new ForbiddenException('Only patients can verify payments');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId },
      include: { appointment: true },
    });
    if (!payment) {
      throw new NotFoundException('Payment record not found for this order');
    }
    if (payment.patientId !== patient.id) {
      throw new ForbiddenException('This payment does not belong to you');
    }

    if (payment.status === 'PAID') {
      if (payment.razorpayPaymentId !== razorpayPaymentId) {
        throw new BadRequestException('This order has already been paid with a different payment');
      }
      return this.toReceipt(payment);
    }

    if (['CANCELLED', 'COMPLETED', 'EXPIRED'].includes(payment.appointment.status)) {
      throw new BadRequestException('This appointment is no longer available for payment');
    }

    const expectedSignature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');
    const signaturesMatch = expectedSignature.length === razorpaySignature.length && timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(razorpaySignature),
    );

    if (!signaturesMatch) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', errorMessage: 'Signature mismatch' },
      });
      throw new BadRequestException('Payment verification failed: signature mismatch');
    }

    const paidAt = new Date();
    const receiptNumber = `SS-${paidAt.getFullYear()}-${payment.id.slice(0, 8).toUpperCase()}`;
    const paidPayment = await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'PAID',
          razorpayPaymentId,
          paidAt,
          receiptNumber,
          errorMessage: null,
        },
      });
      const appointment = await tx.appointment.update({
        where: { id: payment.appointmentId },
        data: { status: 'SCHEDULED' },
      });
      return { ...updatedPayment, appointment };
    });

    return this.toReceipt(paidPayment);
  }

  private toReceipt(payment: {
    appointmentId: string;
    razorpayOrderId: string | null;
    razorpayPaymentId: string | null;
    amount: number;
    currency: string;
    status: string;
    paidAt: Date | null;
    receiptNumber: string | null;
  }): PaymentReceipt {
    if (!payment.razorpayOrderId || !payment.razorpayPaymentId || !payment.paidAt || !payment.receiptNumber) {
      throw new BadRequestException('Payment receipt is not available yet');
    }

    return {
      receiptNumber: payment.receiptNumber,
      appointmentId: payment.appointmentId,
      razorpayOrderId: payment.razorpayOrderId,
      razorpayPaymentId: payment.razorpayPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      paidAt: payment.paidAt.toISOString(),
    };
  }
}
