import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AISummaryCardProps {
  summary: string;
  confidence: number;
  isActive?: boolean;
  className?: string;
}

const AISummaryCard: React.FC<AISummaryCardProps> = ({ summary, confidence, isActive = true, className }) => {
  return (
    <div className={cn("bg-white p-6 rounded-2xl shadow-sm border border-jodhpur-tan/30 mb-6 relative overflow-hidden", className)}>
      {/* Decorative background flair */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-habanero/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-habanero/10 flex items-center justify-center text-habanero">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-deep-space text-sm">AI Patient Summary</h3>
          </div>
          
          {isActive && (
            <div className="bg-orange-50 px-3 py-1 rounded-full flex items-center gap-2 border border-orange-100">
              <span className="w-2 h-2 rounded-full bg-habanero animate-pulse"></span>
              <span className="text-[10px] font-bold text-habanero uppercase tracking-wider">Active</span>
            </div>
          )}
        </div>
        
        <p className="text-sm text-deep-space/80 leading-relaxed mb-6">
          {summary}
        </p>
        
        <div>
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-deep-space">AI Confidence</span>
            <span className="text-sm font-bold text-habanero">{confidence}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-habanero rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${confidence}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummaryCard;
