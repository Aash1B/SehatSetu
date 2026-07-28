import React, { useEffect, useRef } from 'react';
import { MessageSquareText } from 'lucide-react';
import type { TranscriptDTO } from '../../types';
import { cn } from '../../lib/utils';

interface TranscriptPanelProps {
  transcripts: TranscriptDTO[];
  className?: string;
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ transcripts, className }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  return (
    <div className={cn("bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col overflow-hidden", className)}>
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        <MessageSquareText className="w-5 h-5 text-habanero" />
        <h3 className="font-bold text-deep-space">Live Transcript</h3>
        <span className="ml-auto flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {transcripts.map((t) => (
          <div 
            key={t.id} 
            className={cn(
              "flex flex-col max-w-[85%]",
              t.speaker === 'Doctor' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{t.speaker}</span>
              <span className="text-[10px] text-gray-400">{t.timestamp}</span>
            </div>
            <div className={cn(
              "p-3 rounded-2xl text-sm",
              t.speaker === 'Doctor' 
                ? "bg-habanero text-white rounded-tr-sm" 
                : "bg-gray-100 text-deep-space rounded-tl-sm"
            )}>
              {t.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TranscriptPanel;
