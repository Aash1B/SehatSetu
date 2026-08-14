import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { login } from '../api';
import { saveAuth } from '../authStorage';
import BrandLogo from '../../common/components/BrandLogo';
import PasswordInput from '../../common/components/PasswordInput';

export default function DoctorLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState((location.state as any)?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isPendingState = Boolean((location.state as any)?.pendingVerification);

  const [showPendingAlert, setShowPendingAlert] = useState(isPendingState);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setShowPendingAlert(false);
    setLoading(true);
    try {
      const res = await login({ email, password });
      
      if (res.status === 'PENDING') {
        setShowPendingAlert(true);
        setLoading(false);
        return;
      }

      if (res.status === 'REJECTED') {
        setError(`❌ Your doctor registration has been rejected by the administrator. ${res.rejectionReason ? `Reason: ${res.rejectionReason}` : 'Please contact support at support@sehatsetu.com.'}`);
        setLoading(false);
        return;
      }

      if (res.role !== 'DOCTOR') {
        setError('This account is registered as a Patient. Please use the Patient login.');
        return;
      }

      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      const requestedPath = (location.state as { from?: string } | null)?.from;
      if (requestedPath && requestedPath.startsWith('/doctor/') && requestedPath !== '/doctor/onboarding' && requestedPath !== '/doctor/login') {
        navigate(requestedPath, { replace: true });
      } else {
        navigate(res.onboardingCompleted ? '/doctor/dashboard' : '/doctor/onboarding', { replace: true });
      }
    } catch (err: any) {
      if (err.message.toLowerCase().includes('verify your email')) {
        navigate('/verify-otp', { state: { email, role: 'DOCTOR' } });
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#fff7ed] via-[#fed7aa] to-[#fb923c] px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center">
            <BrandLogo
              className="gap-2"
              markWrapperClassName="w-9 h-9 rounded-lg bg-transparent flex items-center justify-center p-1.5"
              wordmarkClassName="text-3xl font-extrabold tracking-tight"
              accentClassName="text-orange-500 brand-title-accent"
            />
          </Link>
          <p className="text-slate-800 font-bold text-lg mt-2">Doctor Portal Login</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h1 className="text-3xl font-bold text-slate-900 -mt-3 mb-5 text-center">Welcome!</h1>

          {(showPendingAlert || isPendingState) && (
            <div className="mb-4 p-4.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-sm sm:text-base font-semibold space-y-2">
              <div className="flex items-center gap-2 font-extrabold text-amber-900 text-base sm:text-lg">
                <span>⏳ Registration Under Verification</span>
              </div>
              <p className="text-slate-800 font-medium text-sm sm:text-base leading-relaxed">
                Thank you for registering! Your uploaded medical documents & credentials are currently under review by SehatSetu. You will be notified via email once your account is verified, after which you can log in using the email and password created during registration.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm font-medium leading-relaxed">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1 px-1">
                <label className="block text-sm font-semibold text-slate-700">Password</label>
                <Link to="/forgot-password" className="text-xs text-indigo-700 hover:underline">Forgot password?</Link>
              </div>
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                placeholder=""
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
            Don't have a doctor account?{' '}
            <Link to="/doctor/signup" className="text-[#223382] font-bold hover:underline">Sign up as Doctor</Link>
          </p>
        </div>

        <div className="mt-6 text-center bg-white/90 backdrop-blur-xs p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-sm font-medium text-slate-700 mb-2">Looking for Medical Consultations? Need a doctor?</p>
          <Link
            to="/patient/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            Patient Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
