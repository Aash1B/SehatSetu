import { useState } from 'react';
import { createOrder, verifyPayment } from './api';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PayButtonProps {
  appointmentId: string;
  patientName: string;
  patientEmail: string;
  onSuccess?: () => void;
}

export default function PayButton({ appointmentId, patientName, patientEmail, onSuccess }: PayButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async () => {
    setError('');
    setLoading(true);
    try {
      const order = await createOrder(appointmentId);

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'SehatSetu',
        description: 'Appointment consultation fee',
        order_id: order.orderId,
        prefill: {
          name: patientName,
          email: patientEmail,
        },
        theme: {
          color: '#f97316',
        },
        handler: async (response: any) => {
          try {
            await verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            onSuccess?.();
          } catch (err: any) {
            setError(err.message);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <p className="text-sm text-red-500 mb-2">{error}</p>}
      <button
        onClick={handlePay}
        disabled={loading}
        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium px-6 py-2.5 rounded-lg transition"
      >
        {loading ? 'Opening payment...' : 'Pay Consultation Fee'}
      </button>
    </div>
  );
}