import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login, googleLogin } from '../api';
import { saveAuth } from '../authStorage';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useTranslation } from 'react-i18next';

export default function PatientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('auth');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      if (res.role !== 'PATIENT') {
        setError(t('patientLogin.doctorAccountError'));
        return;
      }
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      const requestedPath = (location.state as { from?: string } | null)?.from;
      navigate(requestedPath?.startsWith('/patient/') ? requestedPath : '/patient/dashboard', { replace: true });
    } catch (err: any) {
  setError(err.message);
  if (err.message.toLowerCase().includes('verify your email')) {
    navigate('/verify-otp', { state: { email, role: 'PATIENT' } }); // 'DOCTOR' in DoctorLogin.tsx
  }
}finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    setGoogleLoading(true);
    try {
      const res = await googleLogin({ credential, role: 'PATIENT' });
      if (res.role !== 'PATIENT') {
        setError(t('patientLogin.doctorAccountError'));
        return;
      }
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      const requestedPath = (location.state as { from?: string } | null)?.from;
      navigate(requestedPath?.startsWith('/patient/') ? requestedPath : '/patient/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-2xl font-bold">
            <span className="text-orange-500">Sehat</span>
            <span className="text-slate-900">Setu</span>
          </Link>
          <p className="text-slate-500 mt-2">{t('patientLogin.portalLabel')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-6">{t('patientLogin.title')}</h1>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{t('patientLogin.emailLabel')}</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder={t('patientLogin.emailPlaceholder')}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
  <label className="block text-sm font-medium text-slate-700">{t('patientLogin.passwordLabel')}</label>
  <Link to="/forgot-password" className="text-xs text-orange-500 hover:underline">{t('patientLogin.forgotPassword')}</Link>
</div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder={t('patientLogin.passwordPlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? t('patientLogin.submitting') : t('patientLogin.submit')}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t('patientLogin.orSeparator')}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <GoogleSignInButton
            role="PATIENT"
            mode="login"
            onCredential={handleGoogleCredential}
            onError={setError}
          />

          {googleLoading && (
            <p className="mt-3 text-center text-xs text-slate-500">{t('patientLogin.googleLoading')}</p>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            {t('patientLogin.noAccount')}{' '}
            <Link to="/patient/signup" className="text-orange-500 font-medium hover:underline">
              {t('patientLogin.signUp')}
            </Link>
          </p>
        </div>

        <div className="mt-6 text-center bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-700 mb-2">Are you a doctor or medical practitioner?</p>
          <Link
            to="/doctor/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-[#223382] hover:bg-[#1a2868] text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            {t('patientLogin.doctorLink')}
          </Link>
        </div>
      </div>
    </div>
  );
}
