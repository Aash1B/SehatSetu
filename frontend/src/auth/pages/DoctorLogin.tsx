import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../api';
import { saveAuth } from '../authStorage';

export default function DoctorLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      if (res.role !== 'DOCTOR') {
        setError('This account is registered as a Patient. Please use the Patient login.');
        return;
      }
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      navigate('/doctor/dashboard');
    } catch (err: any) {
  setError(err.message);
  if (err.message.toLowerCase().includes('verify your email')) {
    navigate('/verify-otp', { state: { email, role: 'PATIENT' } }); // 'DOCTOR' in DoctorLogin.tsx
  }
}finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-slate-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1 text-2xl font-bold">
            <span className="text-orange-500">Sehat</span>
            <span className="text-slate-900">Setu</span>
          </Link>
          <p className="text-slate-500 mt-2">Doctor Portal Login</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-6">Welcome back, Doctor</h1>

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
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="doctor@example.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
  <label className="block text-sm font-medium text-slate-700">Password</label>
  <Link to="/forgot-password" className="text-xs text-indigo-700 hover:underline">Forgot password?</Link>
</div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-900 hover:bg-indigo-800 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link to="/doctor/signup" className="text-indigo-700 font-medium hover:underline">Sign up</Link>
          </p>
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          Are you a patient?{' '}
          <Link to="/patient/login" className="text-slate-600 hover:underline">Patient login</Link>
        </p>
      </div>
    </div>
  );
}