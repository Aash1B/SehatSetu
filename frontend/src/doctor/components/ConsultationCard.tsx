import React from 'react';
import { Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { cn } from '../../lib/utils';
import type { ConsultationSummary } from '../../types';

export interface ConsultationCardProps {
  consultation: ConsultationSummary;
  onViewPatient?: () => void;
  onViewSummary?: () => void;
  className?: string;
}

const ConsultationCard: React.FC<ConsultationCardProps> = ({
  consultation,
  onViewPatient,
  onViewSummary,
  className
}) => {
  const { patient, time, tags } = consultation;
  return (
    <div className={cn("bg-white p-5 md:p-6 rounded-2xl border border-slate-200 flex items-center justify-between shadow-[0_6px_20px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)] transition-all gap-4", className)}>
      {/* Left Column: Circular DP Avatar + Divider + Patient Name + Status Badge */}
      {/* Left Column: Circular DP Avatar + Divider + Patient Name & Status Badge */}
      <div className="flex items-center gap-3 md:gap-4 shrink-0">
        {/* Circular DP Avatar */}
        <div className="w-14 h-14 md:w-16 md:h-16 rounded-full font-black text-xl md:text-2xl flex items-center justify-center shrink-0 bg-[#e0e8ff] text-[#0a2540] shadow-2xs border border-[#c7d2fe]">
          {patient.initials}
        </div>

        {/* Vertical Divider Line */}
        <div className="w-[1.5px] h-9 bg-slate-200 shrink-0 mx-1 md:mx-1.5" />

        {/* Patient Name & Status Badge on the exact same row */}
        <div className="flex items-center gap-3 shrink-0">
          <h4 className="font-black text-slate-900 text-2xl md:text-3xl lg:text-[28px] tracking-tight leading-none">{patient.name}</h4>
          {tags
            ?.filter((tag) => tag.label.toLowerCase() !== 'consultation')
            .map((tag, idx) => (
              <StatusBadge key={idx} label={tag.label} variant={tag.variant as any} />
            ))}
        </div>
      </div>

      {/* Center Column: Time & Date (Equal flex-1 middle space across all cards = 100% perfectly centered & aligned!) */}
      <div className="flex-1 flex flex-col items-center justify-center text-slate-600 font-normal">
        <div className="flex items-center gap-2 font-extrabold text-slate-900 text-base md:text-lg">
          <Clock className="w-5 h-5 text-[#223382]" />
          <span>{time}</span>
        </div>
        {consultation.date && (
          <span className="text-xs md:text-sm font-bold text-slate-400 mt-0.5">{consultation.date}</span>
        )}
      </div>

      {/* Right Column: Action Buttons (Fixed 380px width) */}
      <div className="flex items-center justify-end gap-3 w-[380px] shrink-0">
        <button 
          type="button"
          className="bg-[#223382] hover:bg-[#1a2868] text-white border border-[#223382] px-5 py-2.5 rounded-xl font-bold text-sm md:text-base transition-all shadow-xs whitespace-nowrap cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onViewSummary?.();
          }}
        >
          Consultation Summary
        </button>
        <button 
          onClick={onViewPatient}
          className="bg-habanero hover:bg-[#e0750e] text-white px-6 py-2.5 rounded-xl font-bold text-sm md:text-base transition-all shadow-xs whitespace-nowrap cursor-pointer"
        >
          View Patient
        </button>
      </div>
    </div>
  );
};

export default ConsultationCard;
