import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/constants';
import { setToken } from '../utils/storage';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const backendUrl = API_BASE_URL.replace(/\/api$/, '');
      const response = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || typeof body?.accessToken !== 'string') {
        throw new Error(
          typeof body?.message === 'string' ? body.message : t('auth:patientLogin.signInFailed'),
        );
      }
      if (body.role !== 'PATIENT') {
        throw new Error(t('auth:patientLogin.patientAccountRequired'));
      }
      setToken(body.accessToken);
      navigate('/patient/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('auth:patientLogin.signInFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg"
      >
        <h1 className="mb-2 text-3xl font-bold text-slate-900">{t('auth:patientLogin.title')}</h1>
        <p className="mb-6 text-sm text-slate-600">
          {t('auth:patientLogin.description')}
        </p>

        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {t('auth:patientLogin.emailLabel')}
        </label>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3"
          required
          autoComplete="email"
        />

        <label className="mb-2 block text-sm font-semibold text-slate-700">
          {t('auth:patientLogin.passwordLabel')}
        </label>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mb-4 w-full rounded-lg border border-slate-300 px-4 py-3"
          required
          autoComplete="current-password"
        />

        {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white disabled:opacity-60"
        >
          {submitting ? t('auth:patientLogin.submitting') : t('auth:patientLogin.submit')}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
