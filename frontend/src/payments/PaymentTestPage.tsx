import { useState } from 'react';
import PayButton from './PayButton';

export default function PaymentTestPage() {
  const [success, setSuccess] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">Payment Test</h1>
        <p className="text-sm text-slate-500 mb-6">Appointment: e321edc9-6f15-42e9-a640-20ce407e3d86</p>

        {success ? (
          <p className="text-green-600 font-medium">Payment verified successfully! ✅</p>
        ) : (
          <PayButton
            appointmentId="e321edc9-6f15-42e9-a640-20ce407e3d86"
            patientName="Patient Payment Test"
            patientEmail="aashi_a44+patient@delhitechnicalcampus.ac.in"
            onSuccess={() => setSuccess(true)}
          />
        )}
      </div>
    </div>
  );
}