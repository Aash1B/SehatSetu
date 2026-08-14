import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Mail, Phone } from 'lucide-react';
import { login, googleLogin, sendPhoneOtp, verifyPhoneOtp, phoneSignup } from '../api';
import { saveAuth } from '../authStorage';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../common/components/BrandLogo';
import PasswordInput from '../../common/components/PasswordInput';

type LoginMethod = 'email' | 'phone';

export default function PatientLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('auth');
  
  // Tab state
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  
  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone login state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneFullName, setPhoneFullName] = useState(''); // Name for new users
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [testOtp, setTestOtp] = useState(''); // For testing - shows the OTP on screen
  
  // Common state
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Start countdown timer
  const startOtpTimer = () => {
    setOtpTimer(60);
    const interval = setInterval(() => {
      setOtpTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEmailSubmit = async (e: FormEvent) => {
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
      const raw = err?.message || '';
      const msg = (raw === 'Failed to fetch' || raw.includes('Failed to fetch'))
        ? 'Unable to connect to SehatSetu backend server. Please make sure the backend server is running.'
        : raw;
      setError(msg || 'An error occurred during sign in');
      if (raw.toLowerCase().includes('verify your email')) {
        navigate('/verify-otp', { state: { email, role: 'PATIENT' } });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await sendPhoneOtp({ phoneNumber, role: 'PATIENT' });
      if (res.devOtp) {
        setTestOtp(res.devOtp);
      }
      setOtpSent(true);
      startOtpTimer();
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await sendPhoneOtp({ phoneNumber, role: 'PATIENT' });
      if (res.devOtp) {
        setTestOtp(res.devOtp);
      }
      startOtpTimer();
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP');
      return;
    }
    
    setError('');
    setLoading(true);
    
    try {
      // Try actual backend verification
      const res = await verifyPhoneOtp({ phoneNumber, otp, role: 'PATIENT' });
      if (res.role !== 'PATIENT') {
        setError(t('patientLogin.doctorAccountError'));
        return;
      }
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      const requestedPath = (location.state as { from?: string } | null)?.from;
      navigate(requestedPath?.startsWith('/patient/') ? requestedPath : '/patient/dashboard', { replace: true });
    } catch (err: any) {
      const errMsg = (err.message || '').toLowerCase();
      if (errMsg.includes('not found') || errMsg.includes('complete your registration') || errMsg.includes('does not exist')) {
        if (!phoneFullName.trim()) {
          setError('This number is not registered. Please enter your full name above to create an account.');
          return;
        }
        try {
          const signupRes = await phoneSignup({
            phoneNumber,
            otp,
            fullName: phoneFullName,
            role: 'PATIENT',
            dataConsent: true,
          });
          saveAuth(signupRes.accessToken, { id: signupRes.id, email: signupRes.email, fullName: signupRes.fullName, role: signupRes.role });
          const requestedPath = (location.state as { from?: string } | null)?.from;
          navigate(requestedPath?.startsWith('/patient/') ? requestedPath : '/patient/dashboard', { replace: true });
        } catch (signupErr: any) {
          setError(signupErr.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
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

  const resetPhoneState = () => {
    setOtpSent(false);
    setOtp('');
    setOtpTimer(0);
    setTestOtp('');
    setPhoneFullName('');
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
          <p className="text-slate-500 mt-2">{t('patientLogin.portalLabel')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          <h1 className="text-xl font-semibold text-slate-900 mb-6">{t('patientLogin.title')}</h1>

          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('email');
                setError('');
                resetPhoneState();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition ${
                loginMethod === 'email'
                  ? 'bg-white text-orange-500 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              Email
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('phone');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition ${
                loginMethod === 'phone'
                  ? 'bg-white text-orange-500 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Phone className="w-4 h-4" />
              Phone Number
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">{error}</div>
          )}

          {/* Email Login Form */}
          {loginMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
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
                <PasswordInput
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
          )}

          {/* Phone Login Form */}
          {loginMethod === 'phone' && (
            <form onSubmit={otpSent ? handlePhoneSubmit : handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    setPhoneNumber(value);
                    if (otpSent && value !== phoneNumber) {
                      resetPhoneState();
                    }
                  }}
                  disabled={otpSent}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Enter 10-digit mobile number"
                  maxLength={10}
                />
                {!otpSent && (
                  <p className="text-xs text-slate-500 mt-1">We'll send you a 6-digit OTP</p>
                )}
              </div>

              {!otpSent ? (
                <button
                  type="submit"
                  disabled={loading || phoneNumber.length < 10}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              ) : (
                <>
                  {/* TEST OTP DISPLAY - Remove this in production */}
                  {testOtp && (
                    <div className="p-3 rounded-lg bg-green-50 border-2 border-green-500 text-center">
                      <p className="text-xs font-semibold text-green-700 mb-1">🔑 TEST OTP (For Development)</p>
                      <p className="text-2xl font-bold text-green-900 tracking-widest">{testOtp}</p>
                      <p className="text-xs text-green-600 mt-1">Copy this OTP to test login</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={phoneFullName}
                      onChange={(e) => setPhoneFullName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                      placeholder="Enter your full name"
                    />
                    <p className="text-xs text-slate-500 mt-1">Required for new users or optional if already registered</p>
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Enter OTP</label>
                      <button
                        type="button"
                        onClick={() => resetPhoneState()}
                        className="text-xs text-orange-500 hover:underline"
                      >
                        Change number
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setOtp(value);
                      }}
                      className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 text-center text-xl tracking-widest"
                      placeholder="• • • • • •"
                      maxLength={6}
                    />
                    <p className="text-xs text-slate-500 mt-1">OTP sent to {phoneNumber}</p>
                  </div>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                  >
                    {loading ? 'Verifying...' : 'Verify & Login'}
                  </button>
                  <div className="text-center">
                    {otpTimer > 0 ? (
                      <p className="text-xs text-slate-500">Resend OTP in {otpTimer}s</p>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="text-sm text-orange-500 font-medium hover:underline disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                </>
              )}
            </form>
          )}

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
          <p className="text-sm font-medium text-slate-700 mb-2">Are you a Doctor or a Medical Practitioner?</p>
          <Link
            to="/doctor/login"
            className="inline-flex items-center justify-center gap-2 w-full bg-[#223382] hover:bg-[#1a2868] text-white font-medium py-2.5 px-4 rounded-lg transition-all shadow-xs cursor-pointer"
          >
            {t('patientLogin.doctorLink')}
          </Link>
        </div>
      </div>
    </div>
  );
}
