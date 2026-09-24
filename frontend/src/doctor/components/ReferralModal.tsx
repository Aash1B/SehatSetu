import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Building2, Send, AlertCircle } from 'lucide-react';
import { createReferral, type ReferralRecord } from '../../services/referralsApi';

export interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultationId?: string;
  patientId: string;
  fromDoctorId?: string;
  patientName: string;
  onSubmit?: (data: ReferralRecord) => void;
}

const COMMON_FACILITIES = [
  { name: 'Kashi District Government Hospital', type: 'GOVERNMENT' as const },
  { name: 'Ramnagar Primary Health Centre (PHC)', type: 'GOVERNMENT' as const },
  { name: 'Arogya Community Health Centre (CHC)', type: 'GOVERNMENT' as const },
  { name: 'Apex Multi-Specialty Clinic', type: 'SPECIALTY' as const },
  { name: 'Heritage Specialty Medical Center', type: 'PRIVATE' as const },
];

const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  consultationId,
  patientId,
  fromDoctorId,
  patientName,
  onSubmit,
}) => {
  const { t } = useTranslation('doctor');
  const [recommendedFacility, setRecommendedFacility] = useState(COMMON_FACILITIES[0].name);
  const [facilityType, setFacilityType] = useState<'GOVERNMENT' | 'PRIVATE' | 'SPECIALTY'>('GOVERNMENT');
  const [reason, setReason] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleFacilitySelect = (name: string, type: 'GOVERNMENT' | 'PRIVATE' | 'SPECIALTY') => {
    setRecommendedFacility(name);
    setFacilityType(type);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError(t('referral.reasonRequired', 'Please provide a reason for referral'));
      return;
    }

    if (scheduledDate) {
      const today = getTodayDateString();
      if (scheduledDate < today) {
        setError(t('referral.pastDateNotAllowed', 'Date cannot be in the past. Only today and future dates are allowed.'));
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');

      const result = await createReferral({
        patientId,
        referredByDoctorId: fromDoctorId,
        appointmentId: consultationId,
        recommendedFacility,
        facilityType,
        reason: reason.trim(),
        scheduledDate: scheduledDate ? new Date(scheduledDate).toISOString() : undefined,
        followUpNotes: notes.trim() || undefined,
      });

      if (onSubmit) {
        onSubmit(result);
      }

      onClose();
      // Reset form
      setReason('');
      setNotes('');
      setScheduledDate('');
    } catch (err: any) {
      setError(err?.message || t('referral.creationFailed', 'Failed to create referral'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                {t('referral.modalTitle', 'Create Facility Referral')}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('referral.patient', 'Patient')}: <span className="font-bold text-slate-800">{patientName}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form id="referral-form" onSubmit={handleSubmit} className="space-y-4">
            {/* Quick facility suggestions */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('referral.selectFacility', 'Target Healthcare Facility')} *
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {COMMON_FACILITIES.map((f) => (
                  <button
                    key={f.name}
                    type="button"
                    onClick={() => handleFacilitySelect(f.name, f.type)}
                    className={`text-[11px] px-2.5 py-1 rounded-xl font-bold transition border cursor-pointer ${
                      recommendedFacility === f.name
                        ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {f.name.split(' (')[0]}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={recommendedFacility}
                onChange={(e) => setRecommendedFacility(e.target.value)}
                required
                placeholder="Or type facility name..."
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            {/* Facility Type */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('referral.facilityType', 'Facility Type')} *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['GOVERNMENT', 'PRIVATE', 'SPECIALTY'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFacilityType(type)}
                    className={`py-2 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${
                      facilityType === type
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-200'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('referral.clinicalReason', 'Clinical Reason for Referral')} *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                placeholder="Describe reason for referral (e.g., higher center cardiology evaluation, emergency stabilization, ultrasound)..."
                className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 resize-none bg-white"
              />
            </div>

            {/* Scheduled Date (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('referral.recommendedDate', 'Recommended Date of Visit (Optional)')}
              </label>
              <input
                type="date"
                min={getTodayDateString()}
                value={scheduledDate}
                onChange={(e) => {
                  const val = e.target.value;
                  const today = getTodayDateString();
                  if (val && val < today) {
                    setError(t('referral.pastDateNotAllowed', 'Date cannot be in the past. Only today and future dates are allowed.'));
                    setScheduledDate(today);
                  } else {
                    if (error && error.includes('past')) setError('');
                    setScheduledDate(val);
                  }
                }}
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                {t('referral.dateHelper', 'Only today and upcoming dates are allowed')}
              </span>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                {t('referral.additionalNotes', 'Follow-up Notes / Instructions for ASHA (Optional)')}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Ensure patient brings prior ECG reports; ASHA to accompany if needed"
                className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl bg-white"
          >
            {t('buttons.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            form="referral-form"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? t('common.sending', 'Sending...') : t('referral.sendReferral', 'Create Referral')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralModal;
