import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, FileText, LockKeyhole, ShieldCheck, X } from 'lucide-react';
import { signup, googleLogin } from '../api';
import { validatePassword } from '../validatePassword';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { saveAuth } from '../authStorage';


export default function PatientSignup() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
     await signup({ email, password, fullName, role: 'PATIENT', dataConsent });
navigate('/verify-otp', { state: { email, role: 'PATIENT' } });
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
      const res = await googleLogin({ credential, role: 'PATIENT', dataConsent });
      saveAuth(res.accessToken, { id: res.id, email: res.email, fullName: res.fullName, role: res.role });
      navigate('/patient/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGoogleLoading(false);
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <label className="flex items-start gap-3 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={dataConsent}
                onChange={(e) => setDataConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-orange-500"
              />
              <span className="leading-5">
                I consent to SehatSetu processing my personal and health data as described in the privacy notice.
                {' '}
                <button
                  type="button"
                  onClick={() => setPrivacyOpen(true)}
                  className="font-bold text-orange-600 underline decoration-orange-300 underline-offset-2 hover:text-orange-700"
                >
                  Read more
                </button>
              </span>
            </label>
            </div>
            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">or</span>
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
            <p className="mt-3 text-center text-xs text-slate-500">Completing Google sign-in...</p>
          )}

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/patient/login" className="text-orange-500 font-medium hover:underline">Sign in</Link>
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
            <header className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-r from-blue-700 via-blue-600 to-cyan-600 px-6 py-6 text-white sm:px-8">
              <div className="relative z-10 flex items-start gap-4 pr-10">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/30">
                  <ShieldCheck className="h-7 w-7" />
                </span>
                <div>
                  <p className="mb-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-100">SEHATSETU patient privacy</p>
                  <h2 id="privacy-notice-title" className="text-2xl font-black tracking-tight sm:text-3xl">Privacy Notice &amp; User Consent</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-blue-50">Please understand how your personal and healthcare information is handled before creating your account.</p>
                </div>
              </div>
              <button type="button" onClick={() => setPrivacyOpen(false)} aria-label="Close privacy notice" className="absolute right-5 top-5 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"><X className="h-5 w-5" /></button>
            </header>

            <div className="overflow-y-auto px-6 py-6 text-sm leading-7 text-slate-600 sm:px-8">
              <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-5">
                <h3 className="mb-2 text-lg font-extrabold text-slate-900">Welcome to SEHATSETU</h3>
                <p>Thank you for choosing SEHATSETU, an AI-powered healthcare platform designed to provide accessible, secure, and quality healthcare services. Your privacy is important to us, and we are committed to handling your personal information responsibly.</p>
                <p className="mt-2">By continuing, you acknowledge that you understand how your information will be collected, used, stored, and protected while using our platform.</p>
              </div>

              <div className="space-y-7">
                <article>
                  <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-900"><FileText className="h-5 w-5 text-blue-600" />About the DPDP Act, 2023</h3>
                  <p>The Digital Personal Data Protection Act, 2023 is India&apos;s primary law governing the collection, processing, storage, and protection of digital personal data. It was passed by Parliament in August 2023 to strengthen individual privacy rights and establish responsibilities for organizations handling personal information.</p>
                  <p className="mt-2">Because SEHATSETU manages healthcare-related information, the platform is designed around the privacy principles established by the Act.</p>
                </article>

                <article>
                  <h3 className="mb-2 text-base font-extrabold text-slate-900">Information we collect</h3>
                  <ul className="list-disc space-y-1 pl-5 marker:text-blue-500">
                    <li>Name, age, gender, phone number and email address.</li>
                    <li>Symptoms, medical history, allergies, medications, consultation records, prescriptions and diagnostic reports.</li>
                    <li>Appointment details and consultation history.</li>
                    <li>Voice recordings when required for AI-assisted prescription features during consultations.</li>
                    <li>Technical information required for account security and platform performance.</li>
                  </ul>
                </article>

                <article>
                  <h3 className="mb-2 text-base font-extrabold text-slate-900">Why we collect your information</h3>
                  <ul className="list-disc space-y-1 pl-5 marker:text-blue-500">
                    <li>Create and manage your healthcare account and enable secure doctor consultations.</li>
                    <li>Generate and store digital prescriptions and maintain your Electronic Health Record.</li>
                    <li>Provide medical summaries, nutrition recommendations and follow-up reminders.</li>
                    <li>Improve healthcare quality, platform performance and user experience.</li>
                    <li>Comply with applicable legal and regulatory requirements.</li>
                  </ul>
                </article>

                <article className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
                  <h3 className="mb-2 flex items-center gap-2 text-base font-extrabold text-slate-900"><LockKeyhole className="h-5 w-5 text-emerald-600" />How we protect your data</h3>
                  <p>SEHATSETU is designed to securely store personal and medical information, restrict access to authorized users, apply industry-standard security practices, and maintain patient confidentiality throughout consultations and record management.</p>
                </article>

                <article>
                  <h3 className="mb-2 text-base font-extrabold text-slate-900">Your rights</h3>
                  <ul className="list-disc space-y-1 pl-5 marker:text-blue-500">
                    <li>Know what personal information is collected about you and access your healthcare records.</li>
                    <li>Request correction of inaccurate information.</li>
                    <li>Withdraw consent where applicable.</li>
                    <li>Request deletion of your account and personal data, subject to legal or medical-record retention requirements.</li>
                    <li>Contact support about privacy-related concerns.</li>
                  </ul>
                </article>

                <article>
                  <h3 className="mb-2 text-base font-extrabold text-slate-900">Your consent and declaration</h3>
                  <p>By selecting “I Agree” and creating an account, you confirm that you have read and understood this notice and voluntarily consent to the collection, processing and secure storage of your personal and healthcare information for providing SEHATSETU healthcare services.</p>
                </article>
              </div>

              <p className="mt-7 rounded-xl bg-slate-100 p-4 text-xs leading-5 text-slate-500"><strong>Note:</strong> This document is provided for informational purposes as part of the SEHATSETU platform. The final privacy policy and legal compliance requirements should be reviewed by qualified legal professionals before production deployment.</p>
            </div>

            <footer className="flex flex-col gap-3 border-t border-slate-200 bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                <input type="checkbox" checked={dataConsent} onChange={(event) => setDataConsent(event.target.checked)} className="h-4 w-4 accent-orange-500" />
                I have read and agree to this notice
              </label>
              <button
                type="button"
                disabled={!dataConsent}
                onClick={() => setPrivacyOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckCircle2 className="h-4 w-4" /> I Agree &amp; Continue
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
