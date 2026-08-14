import React, { type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface StatCardProps {
  title: string;
  value: ReactNode;
  subtitle: string;
  icon?: LucideIcon;
  imageSrc?: string;
  iconColorClass?: string;
  badgeBgClass?: string;
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  imageSrc,
  iconColorClass = "text-[#223382]",
  badgeBgClass = "bg-[#fff6ed] border-[#ffedd5]",
  className,
}) => {
  return (
    <div className={cn("bg-white p-4 md:p-5 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-between gap-6 transition-all hover:shadow-md cursor-pointer min-h-[90px] md:min-h-[100px]", className)}>
      {/* Left: Icon Badge or Image + (Title & Subtitle below) */}
      <div className="flex items-center gap-5">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-16 h-16 md:w-20 md:h-20 object-contain shrink-0"
          />
        ) : Icon ? (
          <div className={cn("w-16 h-16 md:w-18 md:h-18 rounded-full flex items-center justify-center shrink-0 border", badgeBgClass)}>
            <Icon className={cn("w-8 h-8 md:w-9 md:h-9", iconColorClass)} />
          </div>
        ) : null}

        <div className="flex flex-col justify-center">
          <h3 className="text-base md:text-lg font-extrabold text-slate-900 leading-tight">{title}</h3>
          <p className="text-sm md:text-base text-slate-500 font-medium mt-1">{subtitle}</p>
        </div>
      </div>

      {/* Right: Big Stat Number on the far right */}
      <div className="ml-auto text-4xl md:text-5xl font-black text-green-700 shrink-0 flex items-center">
        {value}
      </div>
    </div>
  );
};

export default StatCard;
