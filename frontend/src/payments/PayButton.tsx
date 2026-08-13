import { useState } from 'react';
import { createOrder, verifyPayment, type PaymentReceipt } from './api';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

interface PayButtonProps {
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  amountLabel?: string;
  buttonClassName?: string;
  buttonLabel?: string;
  onSuccess?: (receipt: PaymentReceipt) => void;
}

export default function PayButton({
  appointmentId,
  patientName,
  patientEmail,
  amountLabel,
  buttonClassName,
  buttonLabel,
  onSuccess,
}: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    setError('');
    if (!window.Razorpay) {
      setError('Payment window could not be loaded. Please refresh and try again.');
      return;
    }

    setLoading(true);
    try {
      const order = await createOrder(appointmentId);
      const options: Record<string, unknown> = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'SehatSetu',
        description: 'Doctor consultation fee',
        order_id: order.orderId,
        prefill: {
          name: patientName,
          email: patientEmail,
        },
        theme: { color: '#f97316' },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const receipt = await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onSuccess?.(receipt);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError('Payment was cancelled. You can try again when ready.');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start payment.');
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-sm text-red-500 mb-2" role="alert">{error}</p>}
      <button
        type="button"
        onClick={handlePay}
        disabled={loading}
        className={buttonClassName || 'bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition'}
      >
        {loading ? 'Opening Razorpay...' : buttonLabel || `Pay with Razorpay${amountLabel ? ` ₹${amountLabel}` : ''}`}
      </button>
    </div>
  );
}
