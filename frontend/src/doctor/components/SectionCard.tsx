import React from 'react';
import { cn } from '../../lib/utils';

export interface SectionCardProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, subtitle, children, className }) => {
  return (
    <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-jodhpur-tan/30", className)}>
      {(title || subtitle) && (
        <div className="flex justify-between items-start mb-4">
          <h3 className="font-bold text-deep-space text-sm md:text-base">{title}</h3>
          {subtitle && <span className="text-xs text-aster-blue">{subtitle}</span>}
        </div>
      )}
      {children}
    </div>
  );
};

export default SectionCard;
