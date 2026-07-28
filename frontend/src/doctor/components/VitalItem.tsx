import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface VitalItemProps {
  icon: LucideIcon;
  value: string;
  label: string;
  iconColorClass?: string;
}

const VitalItem: React.FC<VitalItemProps> = ({ icon: Icon, value, label, iconColorClass = "text-habanero bg-habanero/10" }) => {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center mb-1", iconColorClass)}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="font-bold text-deep-space text-sm">{value}</span>
      <span className="text-[10px] text-aster-blue uppercase tracking-wider">{label}</span>
    </div>
  );
};

export default VitalItem;
