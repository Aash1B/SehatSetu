import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login, googleLogin } from '../api';
import { saveAuth } from '../authStorage';
import GoogleSignInButton from '../components/GoogleSignInButton';

export default function PatientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
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
        setError('This account is registered as a Doctor. Please use the Doctor login.');
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
        setError('This account is registered as a Doctor. Please use the Doctor login.');
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
          <p className="text-slate-500 mt-2">Patient Portal Login</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-6">Welcome back</h1>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1">
  <label className="block text-sm font-medium text-slate-700">Password</label>
  <Link to="/forgot-password" className="text-xs text-orange-500 hover:underline">Forgot password?</Link>
</div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">or</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <GoogleSignInButton
            role="PATIENT"
            mode="login"
            onCredential={handleGoogleCredential}
            onError={setError}
          />

          {googleLoading && (
            <p className="mt-3 text-center text-xs text-slate-500">Completing Google sign-in...</p>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/patient/signup" className="text-orange-500 font-medium hover:underline">
              Sign up
            </Link>
          </p>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          Are you a doctor?{' '}
          <Link to="/doctor/login" className="text-slate-600 hover:underline">Doctor login</Link>
        </p>
      </div>
    </div>
  );
}
