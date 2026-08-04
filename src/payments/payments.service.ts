import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { createHmac } from 'crypto';
import Razorpay = require('razorpay');
import { PrismaService } from '../prisma/prisma.service';


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

    const existingPayment = await this.prisma.payment.findUnique({ where: { appointmentId } });
    if (existingPayment && existingPayment.status === 'PAID') {
      throw new BadRequestException('This appointment has already been paid for');
    }

    const doctor = await this.prisma.doctor.findUnique({ where: { id: appointment.doctorId } });
    const amountInPaise = (doctor?.consultationFee ?? 500) * 100;

    const order = await this.razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: `appt_${appointmentId.slice(0, 8)}_${Date.now()}`,
    });

    if (existingPayment) {
      await this.prisma.payment.update({
        where: { appointmentId },
        data: { razorpayOrderId: order.id, amount: amountInPaise, status: 'PENDING' },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          patientId: patient.id,
          appointmentId,
          razorpayOrderId: order.id,
          amount: amountInPaise,
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
  ) {
    const payment = await this.prisma.payment.findFirst({ where: { razorpayOrderId } });
    if (!payment) {
      throw new NotFoundException('Payment record not found for this order');
    }

    const expectedSignature = createHmac('sha256', process.env.RAZORPAY_KEY_SECRET as string)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
      throw new BadRequestException('Payment verification failed: signature mismatch');
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'PAID' },
    });

    return { message: 'Payment verified successfully', status: 'PAID' };
  }
}