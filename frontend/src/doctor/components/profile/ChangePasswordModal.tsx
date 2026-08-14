import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, Check, Mail, ArrowLeft } from 'lucide-react';
import { changePassword, sendResetOtp, resetPasswordWithOtp } from '../../../auth/api';
import { getUser } from '../../../auth/authStorage';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const user = getUser();
  const [mode, setMode] = useState<'CURRENT' | 'OTP'>('CURRENT');

  // Input states
  const [currentPassword, setCurrentPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Eye toggles
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Status states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Resend OTP countdown
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => setResendCooldown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (!isOpen) return null;

  // Validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasSymbol = /[@#]/.test(newPassword);
  const hasThreeLetters = (newPassword.match(/[A-Za-z]/g) || []).length >= 3;
  const isValidAllowedChars = /^[A-Za-z0-9@#]*$/.test(newPassword);

  const isPasswordValid =
    hasMinLength && hasUppercase && hasSymbol && hasThreeLetters && isValidAllowedChars;
  const isMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const canSubmitCurrent = currentPassword.length > 0 && isPasswordValid && isMatch && !isSubmitting;
  const canSubmitOtp = otp.trim().length === 6 && isPasswordValid && isMatch && !isSubmitting;

  const handleClose = () => {
    if (isSubmitting || isSendingOtp) return;
    setMode('CURRENT');
    setCurrentPassword('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setErrorMessage('');
    setInfoMessage('');
    setSuccessMessage('');
    onClose();
  };

  const handleForgotPasswordClick = async () => {
    setIsSendingOtp(true);
    setErrorMessage('');
    setInfoMessage('');
    try {
      const res = await sendResetOtp();
      setMode('OTP');
      setInfoMessage(res.message || 'OTP verification code sent to your email.');
      setResendCooldown(30);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send OTP email.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || isSendingOtp) return;
    setIsSendingOtp(true);
    setErrorMessage('');
    setInfoMessage('');
    try {
      const res = await sendResetOtp();
      setInfoMessage(res.message || 'New OTP verification code sent to your email.');
      setResendCooldown(30);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to resend OTP email.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (mode === 'CURRENT') {
      if (!canSubmitCurrent) return;
      setIsSubmitting(true);
      try {
        const res = await changePassword({ currentPassword, newPassword });
        setSuccessMessage(res.message || 'Password changed successfully!');
        setTimeout(() => handleClose(), 1800);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to change password');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!canSubmitOtp) return;
      setIsSubmitting(true);
      try {
        const res = await resetPasswordWithOtp({ otp: otp.trim(), newPassword });
        setSuccessMessage(res.message || 'Password reset successfully with OTP!');
        setTimeout(() => handleClose(), 1800);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : 'Failed to reset password with OTP');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#fff6ed] text-[#F98513] rounded-xl border border-orange-100">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-slate-900 leading-tight">
                {mode === 'CURRENT' ? 'Change Password' : 'Reset Password via OTP'}
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                {mode === 'CURRENT' ? 'Update your account password' : `Enter OTP sent to ${user?.email || 'your email'}`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="w-9 h-9 rounded-full hover:bg-slate-200/70 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 md:space-y-5">
          {successMessage ? (
            <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-200 text-center space-y-2 my-2 animate-in fade-in">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-lg font-extrabold text-emerald-900">{successMessage}</h4>
              <p className="text-sm font-semibold text-emerald-700">Closing window...</p>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-2xl border border-red-200 text-red-700 text-sm font-semibold animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {infoMessage && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-200 text-blue-800 text-sm font-semibold animate-in fade-in">
                  <Mail className="w-5 h-5 text-[#223382] shrink-0 mt-0.5" />
                  <span>{infoMessage}</span>
                </div>
              )}

              {/* Mode: CURRENT */}
              {mode === 'CURRENT' ? (
                <>
                  {/* Current Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-bold text-slate-700">Current Password</label>
                      <button
                        type="button"
                        onClick={handleForgotPasswordClick}
                        disabled={isSendingOtp}
                        className="text-xs font-bold text-[#223382] hover:text-[#1a2868] hover:underline cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        {isSendingOtp && <span className="w-3 h-3 border-2 border-[#223382]/30 border-t-[#223382] rounded-full animate-spin" />}
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showCurrent ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#223382] focus:ring-2 focus:ring-[#223382]/20 outline-none text-slate-900 text-sm md:text-base pr-12 transition-all font-medium"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrent(!showCurrent)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Mode: OTP */
                <>
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => { setMode('CURRENT'); setErrorMessage(''); setInfoMessage(''); }}
                      className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Back to Change Password
                    </button>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={resendCooldown > 0 || isSendingOtp}
                      className="text-xs font-bold text-[#223382] hover:underline disabled:opacity-50 cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : isSendingOtp ? 'Sending...' : 'Resend OTP'}
                    </button>
                  </div>

                  {/* 6-Digit OTP Field */}
                  <div className="space-y-1.5">
                    <label className="block text-sm font-bold text-slate-700">6-Digit Email OTP Code</label>
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP code"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#223382] focus:ring-2 focus:ring-[#223382]/20 outline-none text-slate-900 text-lg font-bold tracking-widest text-center transition-all"
                      required
                    />
                  </div>
                </>
              )}

              {/* New Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter your new password"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#223382] focus:ring-2 focus:ring-[#223382]/20 outline-none text-slate-900 text-sm md:text-base pr-12 transition-all font-medium"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              {newPassword.length > 0 && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                  <p className="font-bold text-slate-600 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#223382]" /> Password Requirements:
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-medium">
                    <span className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} /> 8+ characters
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasUppercase ? 'text-emerald-600' : 'text-slate-300'}`} /> Uppercase (A-Z)
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasSymbol ? 'text-emerald-600' : 'text-slate-300'}`} /> Symbol (@ or #)
                    </span>
                    <span className={`flex items-center gap-1.5 ${hasThreeLetters ? 'text-emerald-600 font-semibold' : 'text-slate-400'}`}>
                      <Check className={`w-3.5 h-3.5 ${hasThreeLetters ? 'text-emerald-600' : 'text-slate-300'}`} /> 3+ letters
                    </span>
                  </div>
                </div>
              )}

              {/* Confirm New Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-bold text-slate-700">Confirm New Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className={`w-full px-4 py-3 rounded-xl border outline-none text-slate-900 text-sm md:text-base pr-12 transition-all font-medium ${
                      confirmPassword.length > 0
                        ? isMatch
                          ? 'border-emerald-400 focus:ring-2 focus:ring-emerald-400/20'
                          : 'border-red-300 focus:ring-2 focus:ring-red-400/20'
                        : 'border-slate-200 focus:border-[#223382] focus:ring-2 focus:ring-[#223382]/20'
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && !isMatch && (
                  <p className="text-xs font-bold text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting}
                  className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition-colors cursor-pointer text-sm md:text-base disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mode === 'CURRENT' ? !canSubmitCurrent : !canSubmitOtp}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#223382] hover:bg-[#1a2868] text-white font-bold transition-all shadow-md text-sm md:text-base cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {mode === 'CURRENT' ? 'Updating...' : 'Resetting...'}
                    </span>
                  ) : mode === 'CURRENT' ? (
                    'Save New Password'
                  ) : (
                    'Reset & Save Password'
                  )}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};
