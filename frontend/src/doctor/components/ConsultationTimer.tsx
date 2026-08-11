import React, { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';

interface ConsultationTimerProps {
  className?: string;
}

const ConsultationTimer: React.FC<ConsultationTimerProps> = ({ className }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn(
      "flex items-center gap-3 text-lg font-bold text-[#111b35] transition-colors",
      className
    )}>
      <span
        aria-hidden="true"
        className="h-3 w-3 rounded-full bg-[#18b966] shadow-[0_0_0_4px_rgba(24,185,102,0.12)] animate-pulse"
      />
      <span>{formatTime(seconds)}</span>
    </div>
  );
};

export default ConsultationTimer;
