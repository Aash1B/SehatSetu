import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface VitalItemProps {
  icon?: LucideIcon;
  emoji?: string;
  value: string;
  label: string;
  iconColorClass?: string;
}

const VitalItem: React.FC<VitalItemProps> = ({ icon: Icon, emoji, value, label, iconColorClass = "text-habanero bg-habanero/10" }) => {
  return (
    <div className="flex flex-col items-center justify-center min-w-[75px]">
      <div className={cn("w-11 h-11 rounded-full flex items-center justify-center mb-1.5 text-base md:text-lg shrink-0", iconColorClass)}>
        {emoji ? (
          <span>{emoji}</span>
        ) : Icon ? (
          <Icon className="w-5 h-5 stroke-[2.5]" />
        ) : null}
      </div>
      <span className="font-black text-slate-900 text-base md:text-lg leading-tight">{value}</span>
      <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mt-0.5">{label}</span>
    </div>
  );
};

export default VitalItem;
