import i18n from '../i18n/config';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export interface CreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export interface VerifyPaymentPayload {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export interface PaymentReceipt {
  receiptNumber: string;
  appointmentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  status: 'PAID' | string;
  paidAt: string;
}

function getToken(): string | null {
  return localStorage.getItem('sehatsetu_token');
}

async function paymentRequest<T>(path: string, init: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}/payments${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message || i18n.t('errors:paymentVerificationFailed'));
  }
  return data as T;
}

export function createOrder(appointmentId: string): Promise<CreateOrderResponse> {
  return paymentRequest<CreateOrderResponse>('/create-order', {
    method: 'POST',
    body: JSON.stringify({ appointmentId }),
  });
}

export function verifyPayment(payload: VerifyPaymentPayload): Promise<PaymentReceipt> {
  return paymentRequest<PaymentReceipt>('/verify', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
