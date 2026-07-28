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
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/50 rounded-full transition-colors text-deep-space"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-deep-space">{title}</h1>
      </div>
      <button 
        onClick={onOptionsClick}
        className="p-2 hover:bg-white/50 rounded-full transition-colors text-deep-space"
        aria-label="More options"
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
};

export default PageHeader;
