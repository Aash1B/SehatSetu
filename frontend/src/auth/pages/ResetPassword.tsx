import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { resetPassword } from '../api';
import { validatePassword } from '../validatePassword';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../common/components/BrandLogo';
import PasswordInput from '../../common/components/PasswordInput';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { t } = useTranslation(['auth', 'forms']);
  const resetT = (key: string) => t(`auth:resetPassword.${key}`);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordHint, setPasswordHint] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const check = validatePassword(newPassword);
    if (!check.valid) {
      setError(check.message);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('forms:passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await resetPassword({ token, newPassword });
      setSuccess(res.message);
      setTimeout(() => navigate('/patient/login'), 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{resetT('invalidLink')}</p>
          <Link to="/forgot-password" className="text-orange-500 font-medium hover:underline">{resetT('requestNewLink')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-3 sm:px-4 py-6 sm:py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-6 sm:mb-8">
          <Link to="/" className="inline-flex items-center">
            <BrandLogo
              className="gap-2"
              markWrapperClassName="w-8 h-8 rounded-xl bg-transparent flex items-center justify-center p-1.5"
              wordmarkClassName="text-xl sm:text-2xl font-extrabold tracking-tight"
              accentClassName="text-orange-500 brand-title-accent"
            />
          </Link>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 sm:mt-2">{resetT('title')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-5 sm:p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-600 text-sm">{success}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{resetT('newPasswordLabel')}</label>
              <PasswordInput
                required
                value={newPassword}
                onChange={(e) => {
                  const val = e.target.value;
                  setNewPassword(val);
                  const check = validatePassword(val);
                  setPasswordHint(check.valid ? '' : check.message);
                }}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder={resetT('passwordPlaceholder')}
              />
              {passwordHint && <p className="text-xs text-red-500 mt-1">{passwordHint}</p>}
              <p className="text-xs text-slate-400 mt-1">
                {t('forms:passwordHint')}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{resetT('confirmLabel')}</label>
              <PasswordInput
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder={resetT('confirmPlaceholder')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? resetT('submitting') : resetT('submit')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}