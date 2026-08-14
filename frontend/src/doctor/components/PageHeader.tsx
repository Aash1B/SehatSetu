import React from 'react';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';

export interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  onOptionsClick?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, onBack, onOptionsClick }) => {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        {onBack && (
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-800 cursor-pointer"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <h1 className="text-3xl md:text-4xl lg:text-[40px] font-black text-slate-900 tracking-tight">{title}</h1>
      </div>
      {onOptionsClick && (
        <button 
          onClick={onOptionsClick}
          className="p-2 hover:bg-white/50 rounded-full transition-colors text-slate-800 cursor-pointer"
          aria-label="More options"
        >
          <MoreHorizontal className="w-5 h-5" />
        </button>
      )}
    </div>
  );
};

export default PageHeader;
