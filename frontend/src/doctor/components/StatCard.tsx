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
    <div className={cn("bg-white p-3.5 sm:p-4 md:p-5 rounded-2xl shadow-xs border border-slate-200/90 flex items-center justify-between gap-3 sm:gap-6 transition-all hover:shadow-md cursor-pointer min-h-[84px] sm:min-h-[90px] md:min-h-[100px]", className)}>
      {/* Left: Icon Badge or Image + (Title & Subtitle below) */}
      <div className="flex items-center gap-3 sm:gap-5 min-w-0 flex-1">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={title}
            className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20 object-contain shrink-0"
          />
        ) : Icon ? (
          <div className={cn("w-11 h-11 sm:w-14 sm:h-14 md:w-18 md:h-18 rounded-full flex items-center justify-center shrink-0 border", badgeBgClass)}>
            <Icon className={cn("w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9", iconColorClass)} />
          </div>
        ) : null}

        <div className="flex flex-col justify-center min-w-0 flex-1">
          <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 leading-tight truncate">{title}</h3>
          <p className="text-xs sm:text-sm md:text-base text-slate-500 font-medium mt-0.5 sm:mt-1 line-clamp-2">{subtitle}</p>
        </div>
      </div>

      {/* Right: Big Stat Number on the far right */}
      <div className="ml-2 sm:ml-auto text-2xl sm:text-3xl md:text-5xl font-black text-green-700 shrink-0 flex items-center">
        {value}
      </div>
    </div>
  );
};

export default StatCard;
