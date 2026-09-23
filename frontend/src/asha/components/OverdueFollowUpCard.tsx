import React from 'react';
import { Clock, Phone, CalendarPlus, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { OverdueFollowupItem } from '../services/ashaApi';

export interface OverdueFollowUpCardProps {
  followup: OverdueFollowupItem;
}

const OverdueFollowUpCard: React.FC<OverdueFollowUpCardProps> = ({ followup }) => {
  const navigate = useNavigate();
  const { t } = useTranslation('asha');

  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/80 shadow-2xs space-y-3 font-sans transition hover:border-amber-300">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 truncate">
              {followup.patientName}
            </h4>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 shrink-0">
              <Clock className="w-3 h-3 text-amber-700" />
              <span>{t('followup.daysOverdue', { days: followup.daysOverdue })}</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{followup.patientVillage || 'Village'}</span>
          </div>
        </div>
      </div>

      {followup.healthConcern && (
        <div className="text-xs text-slate-700 bg-amber-50/60 p-2 rounded-xl border border-amber-100">
          <span className="font-semibold text-amber-900">Concern: </span>
          {followup.healthConcern}
        </div>
      )}

      {/* Buttons: 44px min touch target */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        {followup.patientPhone ? (
          <a
            href={`tel:${followup.patientPhone}`}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition min-h-[44px] no-underline"
          >
            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Call Patient</span>
          </a>
        ) : (
          <div className="flex items-center justify-center text-xs text-slate-400 min-h-[44px]">
            No Phone
          </div>
        )}

        <button
          type="button"
          onClick={() => navigate(`/asha/book?patientId=${followup.patientId}`)}
          className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition min-h-[44px] border-none cursor-pointer shadow-xs"
        >
          <CalendarPlus className="w-3.5 h-3.5 shrink-0" />
          <span>{t('followup.scheduleFollowup')}</span>
        </button>
      </div>
    </div>
  );
};

export default OverdueFollowUpCard;
