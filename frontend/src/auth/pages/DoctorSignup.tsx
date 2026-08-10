import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup, googleLogin } from '../api';
import { validatePassword } from '../validatePassword';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { saveAuth } from '../authStorage';

export default function DoctorSignup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
   const passwordCheck = validatePassword(password);
if (!passwordCheck.valid) {
  setError(passwordCheck.message);
  return;
}
    if (!dataConsent) {
      setError('You must consent to data processing to create an account.');
      return;
    }
    setLoading(true);
    try {
      await signup({ email, password, fullName, role: 'DOCTOR', dataConsent });
navigate('/verify-otp', { state: { email, role: 'DOCTOR' } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    if (!dataConsent) {
      setError('You must consent to data processing to continue with Google.');
      return;
    }
    setGoogleLoading(true);
    try {
      const res = await googleLogin({ credential, role: 'DOCTOR', dataConsent });
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      navigate(res.onboardingCompleted ? '/doctor/dashboard' : '/doctor/onboarding', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fff7ed] via-[#fed7aa] to-[#fb923c] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-3xl font-extrabold">
            <span className="text-[#F98513]">Sehat</span>
            <span className="text-slate-900">Setu</span>
          </Link>
          <p className="text-slate-800 font-bold text-lg mt-2">Create your Doctor account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 px-1">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 px-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder=""
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 px-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  const val = e.target.value;
                  setPassword(val);
                  const check = validatePassword(val);
                  setPasswordHint(check.valid ? '' : check.message);
                }}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder=""
              />
              {passwordHint && (
                <p className="text-xs text-red-500 mt-1 px-1">{passwordHint}</p>
              )}
              <p className="text-xs text-slate-400 mt-1 px-1">
                Min 8 chars, 1 uppercase, 1 symbol (@ or #), at least 3 letters
              </p>
            </div>
            <label className="flex items-start gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>I consent to SehatSetu processing data in accordance with the privacy policy (DPDP compliant).</span>
            </label>
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/doctor/login" className="text-indigo-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}