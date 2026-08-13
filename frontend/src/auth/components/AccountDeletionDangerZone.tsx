import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, Mail, Trash2, X } from 'lucide-react';
import { clearAuth } from '../authStorage';
import { confirmAccountDeletion, requestAccountDeletionOtp, type DeletionOtpMetadata } from '../accountDeletionApi';

type Step = 'warning' | 'otp' | 'final' | 'success';

export default function AccountDeletionDangerZone({ role }: { role: 'PATIENT' | 'DOCTOR' }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('warning');
  const [understood, setUnderstood] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [metadata, setMetadata] = useState<DeletionOtpMetadata | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dialogRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    if (loading) return;
    setOpen(false); setStep('warning'); setUnderstood(false); setOtp(''); setConfirmation(''); setError('');
  }, [loading]);

  useEffect(() => {
    if (!open) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape' && !loading) close(); };
    document.addEventListener('keydown', escape);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => { document.removeEventListener('keydown', escape); document.body.style.overflow = ''; };
  }, [open, loading, close]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [seconds]);

  const requestOtp = async () => {
    setLoading(true); setError('');
    try {
      const result = await requestAccountDeletionOtp();
      setMetadata(result); setSeconds(result.resendAfterSeconds); setStep('otp');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send the verification code.');
    } finally { setLoading(false); }
  };

  const deleteAccount = async () => {
    setLoading(true); setError('');
    try {
      await confirmAccountDeletion(otp);
      setStep('success');
      clearAuth();
      localStorage.clear();
      sessionStorage.clear();
      window.setTimeout(() => window.location.replace(role === 'DOCTOR' ? '/doctor/login' : '/patient/login'), 1800);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to delete the account.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <section className="mt-6 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-base leading-5 text-red-700 font-medium">Permanently delete your account and personal information. This action cannot be undone.</p>
            <button type="button" onClick={() => setOpen(true)} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200"><Trash2 className="h-4 w-4" />Delete account</button>
          </div>
        </div>
      </section>

      {open && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
        <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="delete-account-title" className="w-full max-w-lg overflow-hidden rounded-3xl border border-white/50 bg-white shadow-2xl outline-none">
          <header className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-red-100 text-red-600"><Trash2 className="h-5 w-5" /></span><div><p className="text-xs font-bold uppercase tracking-wider text-red-600">Permanent action</p><h2 id="delete-account-title" className="text-xl font-black text-slate-900">Delete your account</h2></div></div>
            {step !== 'success' && <button type="button" onClick={close} aria-label="Cancel account deletion" className="grid h-9 w-9 place-items-center rounded-full text-slate-500 hover:bg-slate-100"><X className="h-5 w-5" /></button>}
          </header>

          <div className="p-6">
            {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
            {step === 'warning' && <>
              <p className="text-sm leading-6 text-slate-600">Your login, profile, private uploads, preferences and future access will be permanently removed. Future patient appointments will be cancelled. Clinical, prescription and payment records may be minimally retained and anonymized where operational or legal retention is required.</p>
              {role === 'DOCTOR' && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Doctors must resolve every upcoming or active consultation before deletion can proceed.</p>}
              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4 text-sm font-semibold text-slate-700"><input type="checkbox" checked={understood} onChange={(event) => setUnderstood(event.target.checked)} className="mt-0.5 h-4 w-4 accent-red-600" />I understand that this action cannot be undone.</label>
              <div className="mt-6 flex justify-end gap-3"><button type="button" onClick={close} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Cancel</button><button type="button" disabled={!understood || loading} onClick={requestOtp} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">{loading && <Loader2 className="h-4 w-4 animate-spin" />}Continue</button></div>
            </>}
            {step === 'otp' && <>
              <div className="text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-blue-50 text-blue-600"><Mail /></span><h3 className="mt-4 text-lg font-extrabold text-slate-900">Check your email</h3><p className="mt-1 text-sm text-slate-600">Enter the six-digit code sent to <strong>{metadata?.maskedDestination}</strong>.</p></div>
              <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} aria-label="Six-digit verification code" className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-center text-2xl font-black tracking-[.45em] outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              <p className="mt-2 text-center text-xs text-slate-500">Code expires at {metadata ? new Date(metadata.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</p>
              <div className="mt-5 flex items-center justify-between"><button type="button" onClick={() => { setStep('warning'); setError(''); }} className="inline-flex items-center gap-1 text-sm font-bold text-slate-600"><ArrowLeft className="h-4 w-4" />Back</button><button type="button" disabled={seconds > 0 || loading} onClick={requestOtp} className="text-sm font-bold text-blue-600 disabled:text-slate-400">{seconds > 0 ? `Resend in ${seconds}s` : 'Resend OTP'}</button></div>
              <button type="button" disabled={otp.length !== 6} onClick={() => { setStep('final'); setError(''); }} className="mt-5 w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white disabled:opacity-40">Continue to final confirmation</button>
            </>}
            {step === 'final' && <>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4"><h3 className="font-extrabold text-red-900">Final confirmation</h3><p className="mt-1 text-sm text-red-700">Type <strong>DELETE</strong> exactly. The account will be anonymized and access will end immediately.</p></div>
              <label className="mt-5 block text-sm font-bold text-slate-700">Type DELETE<input autoFocus value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-bold outline-none focus:border-red-500 focus:ring-4 focus:ring-red-100" /></label>
              <div className="mt-6 flex gap-3"><button type="button" onClick={() => setStep('otp')} className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700">Back</button><button type="button" disabled={confirmation !== 'DELETE' || loading} onClick={deleteAccount} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-40">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Verify and permanently delete</button></div>
            </>}
            {step === 'success' && <div className="py-8 text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CheckCircle2 className="h-8 w-8" /></span><h3 className="mt-5 text-xl font-black text-slate-900">Your account has been permanently deleted.</h3><p className="mt-2 text-sm text-slate-600">You are being securely signed out.</p></div>}
          </div>
        </div>
      </div>}
    </>
  );
}
