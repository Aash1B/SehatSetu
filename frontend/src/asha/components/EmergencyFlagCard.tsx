import React, { useState } from 'react';
import { AlertTriangle, Phone, ShieldCheck, Check, PhoneCall } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { verifyEmergencyFlag, type EmergencyItem } from '../services/ashaApi';

export interface EmergencyFlagCardProps {
  emergency: EmergencyItem;
  onVerified?: () => void;
}

const EmergencyFlagCard: React.FC<EmergencyFlagCardProps> = ({ emergency, onVerified }) => {
  const { t } = useTranslation('asha');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(emergency.verifiedByAsha);

  const handleVerify = async () => {
    if (isVerified || isVerifying) return;
    setIsVerifying(true);
    try {
      await verifyEmergencyFlag(emergency.id);
      setIsVerified(true);
      if (onVerified) onVerified();
    } catch (err) {
      console.error('Failed to verify emergency flag:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border-2 border-rose-200/80 shadow-xs space-y-3 relative overflow-hidden font-sans">
      <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-600" />

      {/* Top row: Status header */}
      <div className="flex items-start justify-between gap-2 pl-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-rose-600 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-snug">
              {emergency.patientName}
            </h4>
            <p className="text-xs text-slate-500">
              {emergency.patientVillage || 'Field Area'}
            </p>
          </div>
        </div>

        {/* Verification Badge */}
        {isVerified ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>{t('emergency.verifiedBadge')}</span>
          </span>
        ) : (
          <span className="inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 shrink-0">
            {t('emergency.unverifiedBadge')}
          </span>
        )}
      </div>

      {/* Health Concern & Symptoms */}
      <div className="pl-2 space-y-1.5 text-xs text-slate-700 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
        {emergency.healthConcern && (
          <p className="font-semibold text-rose-950">
            <span className="text-rose-700 font-bold">Concern: </span>
            {emergency.healthConcern}
          </p>
        )}
        {emergency.symptoms && emergency.symptoms.length > 0 && (
          <p className="text-slate-700">
            <span className="font-bold text-slate-900">Symptoms: </span>
            {emergency.symptoms.join(', ')}
          </p>
        )}
        {emergency.severity && (
          <p className="text-slate-600 font-medium">
            <span className="font-bold text-slate-900">Severity: </span>
            {emergency.severity}
          </p>
        )}
      </div>

      {/* Action Buttons: Touch-optimized for mobile field use */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-2 pt-1">
        {/* Call 108 */}
        <a
          href="tel:108"
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition min-h-[44px] no-underline shadow-xs"
        >
          <PhoneCall className="w-4 h-4 shrink-0" />
          <span>{t('emergency.call108')}</span>
        </a>

        {/* Call Patient */}
        {emergency.patientPhone ? (
          <a
            href={`tel:${emergency.patientPhone}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition min-h-[44px] no-underline"
          >
            <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{t('emergency.dialPatient')}</span>
          </a>
        ) : (
          <div className="flex items-center justify-center text-xs text-slate-400 min-h-[44px]">
            No Phone
          </div>
        )}

        {/* Verify Toggle */}
        <button
          type="button"
          onClick={handleVerify}
          disabled={isVerified || isVerifying}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition min-h-[44px] border-none cursor-pointer ${
            isVerified
              ? 'bg-emerald-50 text-emerald-700 cursor-default'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
          }`}
        >
          {isVerified ? (
            <>
              <Check className="w-4 h-4" />
              <span>Verified</span>
            </>
          ) : isVerifying ? (
            <span>Verifying...</span>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>{t('emergency.verifyAction')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default EmergencyFlagCard;
