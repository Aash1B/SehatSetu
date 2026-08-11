import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../common/components/BrandLogo';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const { t } = useTranslation(['auth', 'forms']);
  const forgotT = (key: string) => t(`auth:forgotPassword.${key}`);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPassword({ email });
      setMessage(res.message);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center">
            <BrandLogo
              className="gap-2"
              markWrapperClassName="w-8 h-8 rounded-xl bg-transparent flex items-center justify-center p-1.5"
              wordmarkClassName="text-2xl font-extrabold tracking-tight"
              accentClassName="text-orange-500 brand-title-accent"
            />
          </Link>
          <p className="text-slate-500 mt-2">{forgotT('title')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          {submitted ? (
            <div className="text-center">
              <p className="text-sm text-slate-700">{message}</p>
              <Link to="/patient/login" className="inline-block mt-6 text-orange-500 font-medium hover:underline">
                {forgotT('backToLogin')}
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600 mb-6">
                {forgotT('enterEmail')}
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">{t('forms:email')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder={t('forms:emailPlaceholder')}
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {loading ? forgotT('submitting') : forgotT('submit')}
                </button>
              </form>

              <p className="text-center text-sm text-slate-500 mt-6">
                {forgotT('remembered')}{' '}
                <Link to="/patient/login" className="text-orange-500 font-medium hover:underline">{forgotT('backToLogin')}</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
