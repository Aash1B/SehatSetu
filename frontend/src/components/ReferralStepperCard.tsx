import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Clock,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Stethoscope,
  ChevronRight,
  FileText,
} from 'lucide-react';
import { cn } from '../lib/utils';
import type { ReferralRecord } from '../services/referralsApi';

interface ReferralStepperCardProps {
  referral: ReferralRecord;
  onStatusUpdate?: (id: string, newStatus: string, notes?: string, scheduledDate?: string) => Promise<void>;
  canUpdate?: boolean;
  className?: string;
}

const STEPS = [
  { key: 'PENDING', labelKey: 'referral.steps.pending', icon: Clock },
  { key: 'SCHEDULED', labelKey: 'referral.steps.scheduled', icon: Calendar },
  { key: 'VISITED', labelKey: 'referral.steps.visited', icon: MapPin },
  { key: 'COMPLETED', labelKey: 'referral.steps.completed', icon: CheckCircle2 },
];

export const ReferralStepperCard: React.FC<ReferralStepperCardProps> = ({
  referral,
  onStatusUpdate,
  canUpdate = false,
  className,
}) => {
  const { t } = useTranslation('common');
  const [updating, setUpdating] = useState(false);
  const [showNotesInput, setShowNotesInput] = useState(false);
  const [pendingNextStatus, setPendingNextStatus] = useState<string | null>(null);
  const [notes, setNotes] = useState(referral.followUpNotes || '');
  const [scheduledDate, setScheduledDate] = useState(
    referral.scheduledDate ? new Date(referral.scheduledDate).toISOString().split('T')[0] : '',
  );

  const currentStepIndex = STEPS.findIndex((s) => s.key === referral.status);
  const isDeclined = referral.status === 'DECLINED';

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStepClick = async (nextStatus: string) => {
    if (!onStatusUpdate || updating) return;

    if (nextStatus === 'SCHEDULED' && !scheduledDate) {
      setPendingNextStatus(nextStatus);
      setShowNotesInput(true);
      return;
    }

    try {
      setUpdating(true);
      await onStatusUpdate(referral.id, nextStatus, notes || undefined, scheduledDate || undefined);
      setShowNotesInput(false);
      setPendingNextStatus(null);
    } catch (err) {
      console.error('Failed to update referral status', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveWithNotes = async () => {
    if (!pendingNextStatus || !onStatusUpdate || updating) return;
    try {
      setUpdating(true);
      await onStatusUpdate(
        referral.id,
        pendingNextStatus,
        notes.trim() || undefined,
        scheduledDate || undefined,
      );
      setShowNotesInput(false);
      setPendingNextStatus(null);
    } catch (err) {
      console.error('Failed updating referral status', err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div
      className={cn(
        'bg-white rounded-3xl p-4 sm:p-6 border border-slate-200/90 shadow-2xs transition-all hover:shadow-xs space-y-4',
        className,
      )}
    >
      {/* Header with facility info and badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-extrabold text-slate-900 text-base leading-snug">
                {referral.recommendedFacility}
              </h4>
              <span
                className={cn(
                  'text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md border',
                  referral.facilityType === 'GOVERNMENT'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : referral.facilityType === 'SPECIALTY'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : 'bg-blue-50 text-blue-700 border-blue-200',
                )}
              >
                {t(`referral.facilityTypes.${referral.facilityType.toLowerCase()}`, referral.facilityType)}
              </span>
            </div>
            {referral.referredByDoctor && (
              <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  {t('referral.referredBy', 'Referred by')}: {referral.referredByDoctor.name || 'Doctor'}
                  {referral.referredByDoctor.specialty && ` (${referral.referredByDoctor.specialty})`}
                </span>
              </p>
            )}
          </div>
        </div>

        {/* Current status pill */}
        <div className="shrink-0 self-start sm:self-auto">
          {isDeclined ? (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <AlertCircle className="w-3.5 h-3.5" />
              {t('referral.steps.declined', 'Declined')}
            </span>
          ) : (
            <span
              className={cn(
                'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border',
                referral.status === 'COMPLETED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : referral.status === 'VISITED'
                    ? 'bg-teal-50 text-teal-800 border-teal-300'
                    : referral.status === 'SCHEDULED'
                      ? 'bg-amber-50 text-amber-800 border-amber-300'
                      : 'bg-slate-100 text-slate-700 border-slate-300',
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {t(`referral.steps.${referral.status.toLowerCase()}`, referral.status)}
            </span>
          )}
        </div>
      </div>

      {/* Stepper Pipeline */}
      {!isDeclined && (
        <div className="pt-2 pb-1 overflow-x-auto">
          <div className="min-w-[320px] flex items-center justify-between relative px-2">
            {/* Background connecting bar */}
            <div className="absolute top-1/2 left-8 right-8 -translate-y-1/2 h-1 bg-slate-200 -z-0" />
            {/* Active connecting bar */}
            {currentStepIndex > 0 && (
              <div
                className="absolute top-1/2 left-8 -translate-y-1/2 h-1 bg-emerald-500 transition-all duration-300 -z-0"
                style={{
                  width: `${(currentStepIndex / (STEPS.length - 1)) * (100 - 16)}%`,
                }}
              />
            )}

            {STEPS.map((step, idx) => {
              const StepIcon = step.icon;
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const isFuture = idx > currentStepIndex;

              return (
                <div key={step.key} className="flex flex-col items-center relative z-10">
                  <div
                    className={cn(
                      'w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-200 border-2',
                      isPast
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                        : isCurrent
                          ? 'bg-white border-emerald-600 text-emerald-700 ring-4 ring-emerald-100 shadow-sm'
                          : 'bg-white border-slate-300 text-slate-400',
                    )}
                  >
                    <StepIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span
                    className={cn(
                      'text-[11px] sm:text-xs font-bold mt-2 text-center whitespace-nowrap',
                      isPast
                        ? 'text-emerald-700'
                        : isCurrent
                          ? 'text-slate-900 font-extrabold'
                          : 'text-slate-400',
                    )}
                  >
                    {t(step.labelKey, step.key)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reason & notes block */}
      <div className="bg-slate-50/80 rounded-2xl p-3.5 space-y-2 text-xs">
        <div className="flex items-start gap-2 text-slate-700">
          <span className="font-bold shrink-0 text-slate-900">{t('referral.reason', 'Reason')}:</span>
          <span className="text-slate-600 leading-relaxed">{referral.reason}</span>
        </div>

        {referral.scheduledDate && (
          <div className="flex items-center gap-2 text-slate-700">
            <span className="font-bold shrink-0 text-slate-900">{t('referral.scheduledDate', 'Scheduled Date')}:</span>
            <span className="text-slate-600">{new Date(referral.scheduledDate).toLocaleDateString()}</span>
          </div>
        )}

        {referral.followUpNotes && (
          <div className="flex items-start gap-2 text-slate-700 pt-1 border-t border-slate-200/60">
            <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-900">{t('referral.followUpNotes', 'Follow-up Notes')}: </span>
              <span className="text-slate-600">{referral.followUpNotes}</span>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Status Update Actions (if allowed) */}
      {canUpdate && !isDeclined && referral.status !== 'COMPLETED' && (
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
          {showNotesInput ? (
            <div className="bg-emerald-50/60 rounded-2xl p-3 border border-emerald-200/80 space-y-3">
              <p className="text-xs font-bold text-emerald-950">
                {t('referral.updateStatusPrompt', 'Update Referral Details')} ({pendingNextStatus})
              </p>
              {pendingNextStatus === 'SCHEDULED' && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    {t('referral.selectDate', 'Scheduled Visit Date')}
                  </label>
                  <input
                    type="date"
                    min={getTodayDateString()}
                    value={scheduledDate}
                    onChange={(e) => {
                      const val = e.target.value;
                      const today = getTodayDateString();
                      setScheduledDate(val && val < today ? today : val);
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                  />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  {t('referral.addNotesOptional', 'Follow-up / ASHA Notes (optional)')}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Patient visited district hospital with family, received prescription"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800"
                />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowNotesInput(false)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-xl bg-white"
                >
                  {t('buttons.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSaveWithNotes}
                  disabled={updating}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl transition shadow-xs disabled:opacity-50"
                >
                  {updating ? t('common.saving', 'Saving...') : t('common.confirm', 'Confirm Update')}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-slate-500">
                {t('referral.advancePipeline', 'Advance Status')}:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {referral.status === 'PENDING' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleStepClick('SCHEDULED')}
                      disabled={updating}
                      className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer"
                    >
                      {t('referral.markScheduled', 'Mark Scheduled')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStepClick('VISITED')}
                      disabled={updating}
                      className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition cursor-pointer"
                    >
                      {t('referral.markVisited', 'Mark Visited')}
                    </button>
                  </>
                )}

                {referral.status === 'SCHEDULED' && (
                  <button
                    type="button"
                    onClick={() => handleStepClick('VISITED')}
                    disabled={updating}
                    className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition cursor-pointer"
                  >
                    {t('referral.markVisited', 'Mark Visited')}
                  </button>
                )}

                {referral.status === 'VISITED' && (
                  <button
                    type="button"
                    onClick={() => handleStepClick('COMPLETED')}
                    disabled={updating}
                    className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition cursor-pointer"
                  >
                    {t('referral.markCompleted', 'Mark Completed')}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setPendingNextStatus(
                      referral.status === 'PENDING' ? 'SCHEDULED' : referral.status === 'SCHEDULED' ? 'VISITED' : 'COMPLETED',
                    );
                    setShowNotesInput(true);
                  }}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl hover:bg-slate-50 transition"
                  title="Add follow-up notes"
                >
                  <FileText className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReferralStepperCard;
