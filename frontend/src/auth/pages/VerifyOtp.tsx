import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { verifyOtp, resendOtp } from '../api';
import { saveAuth } from '../authStorage';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../common/components/BrandLogo';

export default function VerifyOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('verifyOtp');
  const email = (location.state as { email?: string; role?: 'PATIENT' | 'DOCTOR' })?.email || '';
  const role = (location.state as { email?: string; role?: 'PATIENT' | 'DOCTOR' })?.role || 'PATIENT';

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const res = await verifyOtp({ email, otp });
      setSuccess(res.message || 'Email verified successfully.');
      if (res.accessToken && res.id && res.email && res.fullName && res.role) {
        saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      }
      setTimeout(() => {
        if (role === 'DOCTOR') {
          navigate('/doctor/onboarding', { replace: true });
        } else {
          navigate('/patient/login', { replace: true });
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setSuccess('');
    setResending(true);
    try {
      const res = await resendOtp({ email });
      setSuccess(res.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{t('noEmail')}</p>
          <Link to="/patient/signup" className="text-orange-500 font-medium hover:underline">{t('goToSignup')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center">
            <BrandLogo
              className="gap-2"
              markWrapperClassName="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center p-1.5"
              wordmarkClassName="text-2xl font-extrabold tracking-tight"
              accentClassName="text-blue-600 brand-title-accent"
            />
          </Link>
          <p className="text-slate-500 mt-2">{t('portalLabel')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <p className="text-sm text-slate-600 mb-6">
            {t('instructions')} <span className="font-medium text-slate-900">{email}</span>. {t('enterCode')}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-600 text-sm">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('codeLabel')}</label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-center text-2xl tracking-[0.5em]"
                placeholder={t('codePlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? t('submitting') : t('submit')}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            {t('didntGetCode')}{' '}
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-orange-500 font-medium hover:underline disabled:opacity-50"
            >
              {resending ? t('resending') : t('resendCode')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}