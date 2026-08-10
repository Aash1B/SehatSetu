import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle: string;
  icon?: LucideIcon;
  iconColorClass?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColorClass = "text-aster-blue",
  className,
}) => {
  return (
    <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col", className)}>
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-slate-800">{title}</h3>
        {Icon ? <Icon className={cn("w-6 h-6", iconColorClass)} /> : null}
      </div>
      <div className="text-4xl font-semibold text-slate-900 mb-1.5">
        {value}
      </div>
      <p className="text-sm text-slate-500 font-normal mt-auto">{subtitle}</p>
    </div>
  );
};

export default StatCard;
