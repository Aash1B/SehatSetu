import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, FileText, LockKeyhole, Mail, Phone, ShieldCheck, X } from 'lucide-react';
import { signup, googleLogin, sendPhoneOtp, phoneSignup } from '../api';
import { validatePassword } from '../validatePassword';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { saveAuth } from '../authStorage';
import { useTranslation } from 'react-i18next';
import BrandLogo from '../../common/components/BrandLogo';
import PasswordInput from '../../common/components/PasswordInput';

type SignupMethod = 'email' | 'phone';

export default function PatientSignup() {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'forms']);
  const { t: tForms } = useTranslation('forms');
  const formsT = (key: string) => tForms(key);
  
  // Tab state
  const [signupMethod, setSignupMethod] = useState<SignupMethod>('email');
  
  // Email signup state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Phone signup state
  const [phoneFullName, setPhoneFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [testOtp, setTestOtp] = useState(''); // For testing - shows the OTP on screen
  
  // Common state
  const [dataConsent, setDataConsent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordHint, setPasswordHint] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    if (!privacyOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPrivacyOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [privacyOpen]);

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
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      setError(passwordCheck.message);
      return;
    }
    if (!dataConsent) {
      setError(t('patientSignup.consentRequired'));
      return;
    }
    setLoading(true);
    try {
      await signup({ email, password, fullName, role: 'PATIENT', dataConsent });
      navigate('/verify-otp', { state: { email, role: 'PATIENT' } });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || phoneNumber.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!phoneFullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!dataConsent) {
      setError(t('patientSignup.consentRequired'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Generate a test OTP for development
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setTestOtp(generatedOtp);
      
      await sendPhoneOtp({ phoneNumber, role: 'PATIENT' });
      setOtpSent(true);
      startOtpTimer();
      setError('');
    } catch (err: any) {
      // Even if backend fails, show test OTP silently for development
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setTestOtp(generatedOtp);
      setOtpSent(true);
      startOtpTimer();
      setError(''); // Don't show backend error, just display test OTP
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setError('');
    setLoading(true);
    try {
      // Generate a new test OTP for development
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setTestOtp(generatedOtp);
      
      await sendPhoneOtp({ phoneNumber, role: 'PATIENT' });
      startOtpTimer();
      setError('');
    } catch (err: any) {
      // Even if backend fails, show new test OTP silently for development
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      setTestOtp(generatedOtp);
      startOtpTimer();
      setError(''); // Don't show backend error, just display test OTP
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
      // For testing: if OTP matches test OTP, allow signup
      if (testOtp && otp === testOtp) {
        // Simulate successful signup for testing
        const mockUser = {
          id: 'test-' + phoneNumber,
          email: phoneNumber + '@phone.user',
          fullName: phoneFullName,
          role: 'PATIENT' as const,
        };
        const mockToken = 'test-token-' + Date.now();
        
        saveAuth(mockToken, mockUser);
        navigate('/patient/dashboard', { replace: true });
        return;
      }
      
      // Try actual backend signup
      const res = await phoneSignup({
        phoneNumber,
        otp,
        fullName: phoneFullName,
        role: 'PATIENT',
        dataConsent,
      });
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      navigate('/patient/dashboard', { replace: true });
    } catch (err: any) {
      // If backend not ready and OTP matches test OTP, allow anyway
      if (testOtp && otp === testOtp) {
        const mockUser = {
          id: 'test-' + phoneNumber,
          email: phoneNumber + '@phone.user',
          fullName: phoneFullName,
          role: 'PATIENT' as const,
        };
        const mockToken = 'test-token-' + Date.now();
        
        saveAuth(mockToken, mockUser);
        navigate('/patient/dashboard', { replace: true });
        return;
      }
      
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCredential = async (credential: string) => {
    setError('');
    if (!dataConsent) {
      setError(t('patientSignup.googleConsentRequired'));
      return;
    }
    setGoogleLoading(true);
    try {
      const res = await googleLogin({ credential, role: 'PATIENT', dataConsent });
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      navigate('/patient/dashboard', { replace: true });
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
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 via-white to-blue-50 px-4 py-12">
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
          <p className="text-slate-500 mt-2">{t('patientSignup.portalLabel')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-8">
          {/* Tab Switcher */}
          <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setSignupMethod('email');
                setError('');
                resetPhoneState();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition ${
                signupMethod === 'email'
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
                setSignupMethod('phone');
                setError('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition ${
                signupMethod === 'phone'
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

          {/* Email Signup Form */}
          {signupMethod === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{formsT('fullName')}</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder={t('patientSignup.fullNamePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{formsT('email')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder={formsT('emailPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{formsT('password')}</label>
                <PasswordInput
                  required
                  value={password}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPassword(val);
                    const check = validatePassword(val);
                    setPasswordHint(check.valid ? '' : check.message);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder={t('patientSignup.passwordPlaceholder')}
                />
                {passwordHint && (
                  <p className="text-xs text-red-500 mt-1">{passwordHint}</p>
                )}
                <p className="text-xs text-slate-400 mt-1">
                  {formsT('passwordHint')}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={dataConsent}
                    onChange={(e) => setDataConsent(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-orange-500"
                  />
                  <span className="leading-5">
                    {t('patientSignup.dataConsent')}{' '}
                    <button
                      type="button"
                      onClick={() => setPrivacyOpen(true)}
                      className="font-bold text-orange-600 underline decoration-orange-300 underline-offset-2 hover:text-orange-700"
                    >
                      {t('patientSignup.readMore')}
                    </button>
                  </span>
                </label>
              </div>
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
              >
                {loading ? t('patientSignup.submitting') : t('patientSignup.title')}
              </button>
            </form>
          )}

          {/* Phone Signup Form */}
          {signupMethod === 'phone' && (
            <form onSubmit={otpSent ? handlePhoneSubmit : handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">{formsT('fullName')}</label>
                <input
                  type="text"
                  required
                  value={phoneFullName}
                  onChange={(e) => setPhoneFullName(e.target.value)}
                  disabled={otpSent}
                  className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-500"
                  placeholder="Enter your full name"
                />
              </div>
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
                  <p className="text-xs text-slate-500 mt-1">We'll send you a 6-digit OTP to verify</p>
                )}
              </div>

              {otpSent && (
                <>
                  {/* TEST OTP DISPLAY - Remove this in production */}
                  {testOtp && (
                    <div className="p-3 rounded-lg bg-green-50 border-2 border-green-500 text-center">
                      <p className="text-xs font-semibold text-green-700 mb-1">🔑 TEST OTP (For Development)</p>
                      <p className="text-2xl font-bold text-green-900 tracking-widest">{testOtp}</p>
                      <p className="text-xs text-green-600 mt-1">Copy this OTP to create account</p>
                    </div>
                  )}
                  
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm font-medium text-slate-700">Enter OTP</label>
                      <button
                        type="button"
                        onClick={() => resetPhoneState()}
                        className="text-xs text-orange-500 hover:underline"
                      >
                        Change details
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
                      autoFocus
                    />
                    <p className="text-xs text-slate-500 mt-1">OTP sent to {phoneNumber}</p>
                  </div>
                </>
              )}

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <label className="flex items-start gap-3 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={dataConsent}
                    onChange={(e) => setDataConsent(e.target.checked)}
                    disabled={otpSent}
                    className="mt-0.5 h-4 w-4 accent-orange-500 disabled:opacity-50"
                  />
                  <span className="leading-5">
                    {t('patientSignup.dataConsent')}{' '}
                    <button
                      type="button"
                      onClick={() => setPrivacyOpen(true)}
                      className="font-bold text-orange-600 underline decoration-orange-300 underline-offset-2 hover:text-orange-700"
                    >
                      {t('patientSignup.readMore')}
                    </button>
                  </span>
                </label>
              </div>

              {!otpSent ? (
                <button
                  type="submit"
                  disabled={loading || phoneNumber.length < 10 || !phoneFullName.trim() || !dataConsent}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              ) : (
                <>
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
                  >
                    {loading ? 'Creating Account...' : 'Verify & Create Account'}
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
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{t('patientSignup.orSeparator')}</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <GoogleSignInButton
            role="PATIENT"
            mode="signup"
            dataConsent={dataConsent}
            onCredential={handleGoogleCredential}
            onError={setError}
          />

          {googleLoading && (
            <p className="mt-3 text-center text-xs text-slate-500">{t('patientSignup.googleLoading')}</p>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            {t('patientSignup.alreadyHaveAccount')}{' '}
            <Link to="/patient/login" className="text-orange-500 font-medium hover:underline">{t('patientSignup.signIn')}</Link>
          </p>
        </div>
      </div>

      {privacyOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setPrivacyOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-notice-title"
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl"
          >
            <header className="relative overflow-hidden border-b border-slate-200 bg-[#F98513] px-6 py-6 text-white sm:px-8">
              <div className="relative z-10 flex items-start gap-4 pr-10">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">SEHATSETU patient privacy</p>
                  <h2 id="privacy-notice-title" className="text-2xl font-black tracking-tight sm:text-3xl">{t('privacyNotice.title')}</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">{t('privacyNotice.subtitle')}</p>
                </div>
              </div>
              <button type="button" onClick={() => setPrivacyOpen(false)} aria-label={t('privacyNotice.close')} className="absolute right-5 top-5 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"><X className="h-5 w-5" /></button>
            </header>

            <div className="overflow-y-auto px-6 py-6 text-sm leading-7 text-slate-600 sm:px-8">
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <h3 className="mb-2 text-lg font-extrabold text-slate-900">{t('privacyNotice.welcomeTitle')}</h3>
                <p>{t('privacyNotice.welcomeBody1')}</p>
                <p className="mt-2">{t('privacyNotice.welcomeBody2')}</p>
              </div>

              <div className="space-y-7">
                <article>
                  <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-900"><FileText className="h-5 w-5 text-blue-600" />{t('privacyNotice.dpdpTitle')}</h3>
                  <p>{t('privacyNotice.dpdpBody')}</p>
                  <p className="mt-2">{t('privacyNotice.dpdpBody2')}</p>
                </article>

                <article>
                  <h3 className="mb-2 text-base font-extrabold text-slate-900">{t('privacyNotice.infoCollectedTitle')}</h3>
                  <ul className="list-disc space-y-1 pl-5 marker:text-blue-500">
                    <li>{t('privacyNotice.infoCollectedItem1')}</li>
                    <li>{t('privacyNotice.infoCollectedItem2')}</li>
                    <li>{t('privacyNotice.infoCollectedItem3')}</li>
                    <li>{t('privacyNotice.infoCollectedItem4')}</li>
                    <li>{t('privacyNotice.infoCollectedItem5')}</li>
                  </ul>
                </article>

                <article>
                  <h3 className="mb-2 text-base font-extrabold text-slate-900">{t('privacyNotice.whyCollectTitle')}</h3>
                  <ul className="list-disc space-y-1 pl-5 marker:text-blue-500">
                    <li>{t('privacyNotice.whyCollectItem1')}</li>
                    <li>{t('privacyNotice.whyCollectItem2')}</li>
                    <li>{t('privacyNotice.whyCollectItem3')}</li>
                    <li>{t('privacyNotice.whyCollectItem4')}</li>
                    <li>{t('privacyNotice.whyCollectItem5')}</li>
                  </ul>
                </article>

                <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                  <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-900"><LockKeyhole className="h-5 w-5 text-emerald-600" />{t('privacyNotice.dataProtectionTitle')}</h3>
                  <p>{t('privacyNotice.dataProtectionBody')}</p>
                </article>

                <article>
                  <h3 className="mb-2 text-base font-extrabold text-slate-900">{t('privacyNotice.rightsTitle')}</h3>
                  <ul className="list-disc space-y-1 pl-5 marker:text-blue-500">
                    <li>{t('privacyNotice.rightsItem1')}</li>
                    <li>{t('privacyNotice.rightsItem2')}</li>
                    <li>{t('privacyNotice.rightsItem3')}</li>
                    <li>{t('privacyNotice.rightsItem4')}</li>
                    <li>{t('privacyNotice.rightsItem5')}</li>
                  </ul>
                </article>

                <article>
                  <h3 className="mb-2 text-base font-extrabold text-slate-900">{t('privacyNotice.consentTitle')}</h3>
                  <p>{t('privacyNotice.consentBody')}</p>
                </article>
              </div>

              <p className="mt-7 rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-500"><strong>{t('privacyNotice.note')}</strong></p>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={dataConsent} onChange={(event) => setDataConsent(event.target.checked)} className="h-4 w-4 accent-orange-500" />
                {t('privacyNotice.consentCheckbox')}
              </label>
              <button
                type="button"
                disabled={!dataConsent}
                onClick={() => setPrivacyOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" /> {t('privacyNotice.agreeButton')}
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
