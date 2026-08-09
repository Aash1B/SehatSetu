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
    <div className={cn("bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-md transition-shadow gap-4", className)}>
      <div className="flex items-center gap-3.5">
        <div className={cn("w-12 h-12 rounded-full font-semibold text-sm flex items-center justify-center shrink-0 bg-[#223382]/10 text-[#223382]")}>
          {patient.initials}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-slate-900 text-xl">{patient.name}</h4>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <StatusBadge key={idx} label={tag.label} variant={tag.variant as any} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-5 shrink-0">
        <div className="text-right flex items-center gap-1.5 text-slate-600 font-normal text-sm">
          <Clock className="w-4.5 h-4.5" />
          {time}
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            className="bg-[#223382] hover:bg-[#1a2868] text-white border border-[#223382] px-5 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onViewSummary?.();
            }}
          >
            Consultation Summary
          </button>
          <button 
            onClick={onViewPatient}
            className="bg-habanero hover:bg-[#e0750e] text-white px-6 py-2 rounded-xl font-semibold text-sm transition-colors shadow-sm whitespace-nowrap cursor-pointer"
          >
            View Patient
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConsultationCard;
