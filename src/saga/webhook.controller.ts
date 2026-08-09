import { Controller, Post, Headers, HttpCode, Body, BadRequestException, Req } from '@nestjs/common';
import { SagaService } from './saga.service';

export class RazorpayWebhookDto {
  event: string;
  payload: {
    payment: {
      entity: {
        id: string;
        entity: string;
        order_id: string;
        amount: number;
        currency: string;
        status: string;
        attempts: number;
        notes: Record<string, string>;
        created_at: number;
      };
    };
  };
}

@Controller('webhooks')
export class WebhookController {
  constructor(private readonly sagaService: SagaService) {}

  @Post('razorpay')
  @HttpCode(200)
  async handleRazorpayWebhook(
    @Headers('x-razorpay-signature') signature: string,
    @Body() dto: RazorpayWebhookDto,
    @Req() req: any,
  ) {
    // Verify webhook signature using the raw payload
    if (!signature) {
      throw new BadRequestException('Missing signature header');
    }

    // Get raw body from Request - NestJS makes it available when configured
    const rawBody = (req as any).rawBody;

    if (!rawBody) {
      throw new BadRequestException('Raw body not available for signature verification');
    }

    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret || webhookSecret === 'replace-with-your-razorpay-webhook-secret') {
      throw new BadRequestException('Webhook secret not configured');
    }

    const crypto = require('crypto');
    const expectedSignature = crypto.createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new BadRequestException('Invalid webhook signature');
    }

    // Handle payment captured event
    if (dto.event === 'payment.captured') {
      const paymentEntity = dto.payload.payment.entity;

      // Verify and confirm appointment
      return this.sagaService.handleWebhook(
        paymentEntity.order_id,
        paymentEntity.id,
        signature,
      );
    }

    // Acknowledge other events
    return { status: 'received' };
  }
}
