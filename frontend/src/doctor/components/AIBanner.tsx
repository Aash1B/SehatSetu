import React from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface AIBannerProps {
  message: string;
  status?: 'online' | 'offline';
  className?: string;
}

const AIBanner: React.FC<AIBannerProps> = ({ 
  message, 
  status = 'online',
  className 
}) => {
  return (
    <div className={cn("bg-deep-space p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between border border-white/10 gap-4 shadow-sm", className)}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-habanero shrink-0 shadow-sm">
          <Sparkles className="w-5 h-5" />
        </div>
        <p className="text-white text-sm font-medium leading-relaxed">
          {message}
        </p>
      </div>
      
      {status === 'online' && (
        <div className="bg-white px-3 py-1.5 rounded-full flex items-center gap-2 border border-green-100 shadow-sm shrink-0">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span className="text-xs font-bold text-green-700">Online</span>
        </div>
      )}
    </div>
  );
};

export default AIBanner;
