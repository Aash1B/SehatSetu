import React from 'react';
import { FileText, Calendar } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { cn } from '../../lib/utils';
import type { EhrDraftRecord } from '../../types';
import { ehrStatusBadgeVariant, ehrStatusLabel } from '../utils/ehrDraftStatus';

export interface EhrDraftCardProps {
  draft: EhrDraftRecord;
  onView: () => void;
  className?: string;
}

const getInitials = (name?: string) => {
  if (!name) return 'PT';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const EhrDraftCard: React.FC<EhrDraftCardProps> = ({ draft, onView, className }) => {
  const patientName = draft.patient?.user?.fullName || 'Unknown Patient';
  const createdDate = new Date(draft.createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div
      className={cn(
        'bg-white p-4 sm:p-5 md:p-6 rounded-2xl border border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between shadow-[0_6px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)] transition-all gap-4',
        className,
      )}
    >
      {/* Left Column: Circular DP Avatar + Divider + Patient Name & Status Badge */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0 w-full lg:w-auto">
        {/* Circular DP Avatar */}
        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-full font-black text-lg sm:text-xl md:text-2xl flex items-center justify-center shrink-0 bg-[#e0e8ff] text-[#0a2540] shadow-2xs border border-[#c7d2fe]">
          {getInitials(patientName)}
        </div>

        {/* Vertical Divider Line */}
        <div className="w-[1.5px] h-9 bg-slate-200 shrink-0 mx-1 md:mx-1.5" />

        {/* Patient Name & Status Badge on the exact same row */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap min-w-0">
          <h4 className="font-black text-slate-900 text-xl sm:text-2xl md:text-3xl lg:text-[28px] tracking-tight leading-none max-w-[190px] sm:max-w-xs truncate">{patientName}</h4>
          <StatusBadge label={ehrStatusLabel(draft.status)} variant={ehrStatusBadgeVariant(draft.status)} />
        </div>
      </div>

      {/* Center Column: Diagnosis & Date Info */}
      <div className="flex-1 flex flex-col items-start justify-center py-1 lg:py-0 lg:pl-6 lg:pr-4 text-slate-600 min-w-0">
        <p className="text-sm sm:text-base md:text-lg font-bold text-slate-800 truncate mb-1 w-full">
          {draft.diagnosis || 'No diagnosis extracted — review structured data'}
        </p>
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm font-semibold text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5 shrink-0">
            <Calendar className="w-4 h-4 text-[#223382]" />
            {createdDate}
          </span>
          {draft.medicalReport && (
            <span className="flex items-center gap-1.5 truncate max-w-full">
              <FileText className="w-4 h-4 shrink-0 text-slate-400" />
              <span className="truncate">{draft.medicalReport.originalFileName}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right Column: Review Action Button */}
      <button
        onClick={onView}
        className="bg-[#9BACD8] hover:bg-[#8a9bc9] text-black px-6 sm:px-7 py-3 md:py-3.5 rounded-2xl text-base md:text-lg font-bold transition-all shadow-xs whitespace-nowrap cursor-pointer w-full lg:w-auto shrink-0 min-h-[44px] flex items-center justify-center"
      >
        Review
      </button>
    </div>
  );
};

export default EhrDraftCard;
