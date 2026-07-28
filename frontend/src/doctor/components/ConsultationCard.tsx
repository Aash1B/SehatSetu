import React from 'react';
import { Clock } from 'lucide-react';
import StatusBadge from './StatusBadge';
import { cn } from '../../lib/utils';
import type { ConsultationSummary } from '../../types';

export interface ConsultationCardProps {
  consultation: ConsultationSummary;
  onViewPatient?: () => void;
  className?: string;
}

const ConsultationCard: React.FC<ConsultationCardProps> = ({
  consultation,
  onViewPatient,
  className
}) => {
  const { patient, time, tags } = consultation;
  return (
    <div className={cn("bg-white p-5 rounded-2xl shadow-sm border border-jodhpur-tan/30 flex items-center justify-between hover:shadow-md transition-shadow", className)}>
      <div className="flex items-center gap-4">
        <div className={cn("w-12 h-12 rounded-full font-bold flex items-center justify-center shrink-0", patient.avatarColorClass || "bg-blue-50 text-blue-600")}>
          {patient.initials}
        </div>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-deep-space">{patient.name}</h4>
            <span className="text-xs text-gray-500 font-medium">{patient.age}{patient.gender}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag, idx) => (
              <StatusBadge key={idx} label={tag.label} variant={tag.variant} />
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 shrink-0">
        <div className="text-right flex items-center gap-1 text-gray-600 font-medium text-sm">
          <Clock className="w-4 h-4" />
          {time}
        </div>
        <button 
          onClick={onViewPatient}
          className="bg-habanero hover:bg-[#e0750e] text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap"
        >
          View Patient
        </button>
      </div>
    </div>
  );
};

export default ConsultationCard;
