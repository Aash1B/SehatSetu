import React from 'react';
import { cn } from '../../lib/utils';

export interface AISummaryCardProps {
  summary: string;
  confidence: number;
  isActive?: boolean;
  className?: string;
}

const AISummaryCard: React.FC<AISummaryCardProps> = ({ summary, confidence, isActive = true, className }) => {
  return (
    <div className={cn("bg-white p-7 md:p-8 rounded-2xl shadow-sm border border-slate-200/80 mb-6 relative overflow-hidden", className)}>
      {/* Decorative background flair */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-habanero/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-5">
          <div>
            <h3 className="font-extrabold text-slate-900 text-2xl md:text-3xl tracking-tight">AI Patient Summary</h3>
          </div>
          
          {isActive && (
            <div className="bg-emerald-50 px-4.5 py-2 rounded-full flex items-center gap-2.5 border border-emerald-200 shrink-0 shadow-2xs">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 animate-pulse"></span>
              </span>
              <span className="text-xs md:text-sm font-extrabold text-emerald-800 uppercase tracking-wider">Active</span>
            </div>
          )}
        </div>
        
        <p className="text-base md:text-lg text-slate-700 leading-relaxed mb-7 font-medium">
          {summary}
        </p>
        
        <div>
          <div className="flex justify-between items-end mb-3">
            <span className="text-lg md:text-xl font-black text-slate-900">AI Confidence</span>
            <span className="text-xl md:text-2xl font-black text-[#223382]">{confidence}%</span>
          </div>
          <div className="h-4.5 w-full bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200/60">
            <div 
              className="h-full bg-[#223382] rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummaryCard;
