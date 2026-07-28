import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
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

  const isLong = seconds > 60 * 15; // > 15 mins

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-lg border font-medium text-sm transition-colors",
      isLong 
        ? "bg-red-50 text-red-600 border-red-200"
        : "bg-green-50 text-green-600 border-green-200",
      className
    )}>
      <Clock className="w-4 h-4" />
      <span>{formatTime(seconds)}</span>
    </div>
  );
};

export default ConsultationTimer;
