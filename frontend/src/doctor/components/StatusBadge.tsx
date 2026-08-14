import React from 'react';
import { X, Check, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label: string;
  variant?: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ className, variant, label, ...props }) => {
  const normLabel = label.toLowerCase();
  
  if (normLabel.includes('cancel')) {
    return (
      <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm md:text-base font-normal bg-[#fee2e2]/80 text-[#dc2626] border border-red-200/40 leading-none", className)} {...props}>
        <span className="w-4.5 h-4.5 rounded-full bg-[#ef4444] text-white flex items-center justify-center shrink-0">
          <X className="w-3 h-3 stroke-[3.5]" />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  if (normLabel.includes('completed')) {
    return (
      <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm md:text-base font-normal bg-[#dcfce7]/80 text-[#16a34a] border border-emerald-200/40 leading-none", className)} {...props}>
        <span className="w-4.5 h-4.5 rounded-full bg-[#22c55e] text-white flex items-center justify-center shrink-0">
          <Check className="w-3 h-3 stroke-[3.5]" />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  if (normLabel.includes('scheduled') || normLabel.includes('progress')) {
    return (
      <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm md:text-base font-semibold bg-[#fef9c3] text-[#854d0e] border border-yellow-300/80 leading-none shadow-2xs", className)} {...props}>
        <span className="w-4.5 h-4.5 rounded-full bg-[#f59e0b] text-white flex items-center justify-center shrink-0">
          <Clock className="w-3 h-3 stroke-[3]" />
        </span>
        <span>{label}</span>
      </span>
    );
  }

  if (normLabel.includes('draft') || normLabel.includes('pending')) {
    return (
      <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-sm md:text-base font-normal bg-slate-100 text-[#F98513] leading-none", className)} {...props}>
        <span>{label}</span>
      </span>
    );
  }

  return (
    <span className={cn("inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm md:text-base font-normal bg-slate-100 text-slate-700 leading-none", className)} {...props}>
      {label}
    </span>
  );
};

export default StatusBadge;
