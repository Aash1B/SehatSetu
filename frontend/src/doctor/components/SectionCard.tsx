import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  titleClassName?: string;
  children: React.ReactNode;
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, headerRight, titleClassName, children, className }) => {
  return (
    <div className={cn("bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200", className)}>
      {(title || subtitle || headerRight) && (
        <div className="flex justify-between items-center mb-6">
          <h3 className={cn("font-black text-slate-900 text-2xl md:text-3xl lg:text-[32px] tracking-tight", titleClassName)}>{title}</h3>
          {headerRight ? headerRight : subtitle ? <span className="text-sm text-aster-blue">{subtitle}</span> : null}
        </div>
      )}
      {children}
    </div>
  );
};

export default SectionCard;
