import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  createOrder(@Body() dto: CreateOrderDto, @Req() req: any) {
    return this.paymentsService.createOrder(dto.appointmentId, req.user.userId);
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  verifyPayment(@Body() dto: VerifyPaymentDto, @Req() req: any) {
    return this.paymentsService.verifyPayment(
      dto.razorpay_order_id,
      dto.razorpay_payment_id,
      dto.razorpay_signature,
      req.user.userId,
    );
  }
}
