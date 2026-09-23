import React, { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../../auth/api';
import { saveAuth } from '../../auth/authStorage';
import BrandLogo from '../../common/components/BrandLogo';
import PasswordInput from '../../common/components/PasswordInput';
import { ShieldCheck, HeartHandshake } from 'lucide-react';

export default function AshaLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('asha');

  const [email, setEmail] = useState((location.state as any)?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fillDemoCredentials = () => {
    setEmail('sunita.asha@sehatsetu.com');
    setPassword('password123');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login({ email: email.trim().toLowerCase(), password });

      if (res.role !== 'ASHA') {
        setError(
          res.role === 'DOCTOR'
            ? 'This account is registered as a Doctor. Please use Doctor Login.'
            : 'This account is registered as a Patient. Please use Patient Login.',
        );
        setLoading(false);
        return;
      }

      saveAuth(res.accessToken, {
        id: res.id,
        email: res.email,
        fullName: res.fullName,
        role: res.role,
        ashaWorker: res.ashaWorker,
      });

      const requestedPath = (location.state as { from?: string } | null)?.from;
      if (requestedPath && requestedPath.startsWith('/asha/') && requestedPath !== '/asha/login') {
        navigate(requestedPath, { replace: true });
      } else {
        navigate('/asha/dashboard', { replace: true });
      }
    } catch (err: any) {
      if (err?.message?.toLowerCase().includes('verify your email')) {
        navigate('/verify-otp', { state: { email, role: 'ASHA' } });
      } else {
        setError(err?.message || 'Login failed. Please check your credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-slate-100 px-4 py-8 font-sans">
      <div className="w-full max-w-md">
        {/* Logo and header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center no-underline">
            <BrandLogo
              className="gap-2"
              markWrapperClassName="w-10 h-10 rounded-xl bg-transparent flex items-center justify-center p-1"
              wordmarkClassName="text-2xl sm:text-3xl font-extrabold tracking-tight"
              accentClassName="text-emerald-600 !text-emerald-600 font-extrabold"
            />
          </Link>

          <div className="mt-3 flex items-center justify-center gap-1.5">
            <HeartHandshake className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              ASHA Community Care
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {t('login.title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            {t('login.subtitle')}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-200/80 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs sm:text-sm text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('login.emailLabel')}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="worker@sehatsetu.com"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition min-h-[48px]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('login.passwordLabel')}
              </label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition min-h-[48px]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 font-bold text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer border-none min-h-[48px] disabled:opacity-50"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{loading ? 'Logging in...' : t('login.submit')}</span>
            </button>
          </form>

          {/* Quick Demo Fill button */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={fillDemoCredentials}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 transition border border-emerald-200 flex items-center justify-center cursor-pointer min-h-[40px]"
            >
              ⚡ Fill Demo: Sunita Devi (ASHA)
            </button>
          </div>

          {/* Role switcher links */}
          <div className="pt-2 text-center text-xs text-slate-500 space-y-1.5">
            <p>{t('login.switchRole')}</p>
            <div className="flex items-center justify-center gap-4 text-emerald-700 font-semibold">
              <Link to="/patient/login" className="hover:underline no-underline text-emerald-700">
                {t('login.patientLogin')}
              </Link>
              <span>•</span>
              <Link to="/doctor/login" className="hover:underline no-underline text-emerald-700">
                {t('login.doctorLogin')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
