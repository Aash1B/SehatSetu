import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle: string;
  icon: LucideIcon;
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
    <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-jodhpur-tan/30 flex flex-col", className)}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-bold text-deep-space">{title}</h3>
        <Icon className={cn("w-5 h-5", iconColorClass)} />
      </div>
      <div className="text-5xl font-bold mb-2">
        {value}
      </div>
      <p className="text-xs text-gray-500 font-medium mt-auto">{subtitle}</p>
    </div>
  );
};

export default StatCard;
