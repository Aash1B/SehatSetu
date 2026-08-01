import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signup } from '../api';
import { saveAuth } from '../authStorage';
import { validatePassword } from '../validatePassword';


export default function PatientSignup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dataConsent, setDataConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      const res = await signup({ email, password, fullName, role: 'PATIENT', dataConsent });
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      navigate('/patient/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-2xl font-bold">
            <span className="text-orange-500">Sehat</span>
            <span className="text-slate-900">Setu</span>
          </Link>
          <p className="text-slate-500 mt-2">Create your Patient account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Ananya Sharma"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="you@example.com"
              />
            </div>
          <div>
  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
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
    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
    placeholder="At least 8 characters"
  />
  {passwordHint && (
    <p className="text-xs text-red-500 mt-1">{passwordHint}</p>
  )}
  <p className="text-xs text-slate-400 mt-1">
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
              <span>I consent to SehatSetu processing my health data in accordance with the privacy policy (DPDP compliant).</span>
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/patient/login" className="text-orange-500 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}