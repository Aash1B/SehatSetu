import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PayButton from './PayButton';

export default function PaymentTestPage() {
  const [success, setSuccess] = useState(false);
  const { t } = useTranslation(['patient', 'appointment']);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-100 p-8 text-center">
        <h1 className="text-xl font-semibold text-slate-900 mb-2">{t('patient:paymentTestTitle')}</h1>
        <p className="text-sm text-slate-500 mb-6">{t('appointment:appointmentTitle')}: e321edc9-6f15-42e9-a640-20ce407e3d86</p>

        {success ? (
          <p className="text-green-600 font-medium">{t('patient:paymentTestVerified')}</p>
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