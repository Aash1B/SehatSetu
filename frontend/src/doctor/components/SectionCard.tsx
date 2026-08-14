import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  titleClassName?: string;
  children: React.ReactNode;
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, titleClassName, children, className }) => {
  return (
    <div className={cn("bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200", className)}>
      {(title || subtitle) && (
        <div className="flex justify-between items-start mb-6">
          <h3 className={cn("font-black text-slate-900 text-2xl md:text-3xl lg:text-[32px] tracking-tight", titleClassName)}>{title}</h3>
          {subtitle && <span className="text-sm text-aster-blue">{subtitle}</span>}
        </div>
      )}
      {children}
    </div>
  );
};

export default SectionCard;
