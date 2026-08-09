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
        'bg-white p-5 rounded-2xl shadow-sm border border-jodhpur-tan/30 flex items-center justify-between hover:shadow-md transition-shadow gap-4',
        className,
      )}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-full font-bold flex items-center justify-center shrink-0 bg-[#223382]/10 text-[#223382]">
          {getInitials(patientName)}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h4 className="font-bold text-black text-lg truncate">{patientName}</h4>
            <StatusBadge label={ehrStatusLabel(draft.status)} variant={ehrStatusBadgeVariant(draft.status)} />
          </div>
          <p className="text-sm text-slate-600 truncate mb-1">
            {draft.diagnosis || 'No diagnosis extracted — review structured data'}
          </p>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {createdDate}
            </span>
            {draft.medicalReport && (
              <span className="flex items-center gap-1 truncate">
                <FileText className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{draft.medicalReport.originalFileName}</span>
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={onView}
        className="bg-habanero hover:bg-[#e0750e] text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap cursor-pointer shrink-0"
      >
        Review
      </button>
    </div>
  );
};

export default EhrDraftCard;
