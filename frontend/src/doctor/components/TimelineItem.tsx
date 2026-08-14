import React from 'react';
import { Star } from 'lucide-react';

export interface TimelineItemProps {
  date?: string;
  description: string;
  isLast?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ date, description, isLast = false }) => {
  const formatDescription = (text: string) => {
    if (!text) return null;

    // Check if string has key: value patterns like "Symptoms: Fever Duration: lessThanDay Severity: Mild Notes: TEST"
    const keyPattern = /(Symptoms|Duration|Severity|Notes):/gi;
    if (keyPattern.test(text)) {
      const parts = text.split(/(?=(?:Symptoms|Duration|Severity|Notes):)/i).filter(Boolean);
      return (
        <ul className="space-y-2.5 mt-0">
          {parts.map((part, idx) => {
            const match = part.match(/^(Symptoms|Duration|Severity|Notes):\s*(.*)/i);
            if (match) {
              const label = match[1];
              let value = match[2].trim();
              if (value === 'lessThanDay') value = '< 1 Day';
              return (
                <li key={idx} className="flex items-start gap-3 text-base md:text-lg lg:text-xl text-slate-700 font-medium">
                  <Star className="w-3.5 h-3.5 text-[#111144] fill-[#111144] shrink-0 mt-1.5" />
                  <div>
                    <span className="font-black text-slate-900">{label}:</span>{' '}
                    <span className="text-slate-800 font-bold">{value}</span>
                  </div>
                </li>
              );
            }
            return (
              <li key={idx} className="flex items-start gap-3 text-base md:text-lg lg:text-xl text-slate-700 font-medium">
                <Star className="w-3.5 h-3.5 text-[#111144] fill-[#111144] shrink-0 mt-1.5" />
                <span className="text-slate-800 font-bold">{part.trim()}</span>
              </li>
            );
          })}
        </ul>
      );
    }

    // Fallback for multiline text
    const lines = text.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      return (
        <ul className="space-y-2.5 mt-0">
          {lines.map((line, idx) => (
            <li key={idx} className="flex items-start gap-3 text-base md:text-lg lg:text-xl text-slate-700 font-medium">
              <Star className="w-3.5 h-3.5 text-[#111144] fill-[#111144] shrink-0 mt-1.5" />
              <span className="text-slate-800 font-bold">{line.trim()}</span>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <ul className="space-y-2.5 mt-0">
        <li className="flex items-start gap-3 text-base md:text-lg lg:text-xl text-slate-700 font-medium">
          <Star className="w-3.5 h-3.5 text-[#111144] fill-[#111144] shrink-0 mt-1.5" />
          <span className="text-slate-800 font-bold">{text}</span>
        </li>
      </ul>
    );
  };

  return (
    <div className={`relative ${date ? 'pl-7 pb-4' : 'pb-2'}`}>
      {/* Timeline line */}
      {!isLast && date && (
        <div className="absolute left-[9px] top-2.5 bottom-0 w-0.5 bg-slate-200"></div>
      )}
      {/* Timeline star icon */}
      {date ? (
        <Star className="absolute left-[-1px] top-1 w-5.5 h-5.5 text-[#111144] fill-[#111144] z-10" />
      ) : null}

      <div className="flex flex-col gap-1.5">
        {date ? (
          <span 
            className="text-sm md:text-base font-bold text-[#111144] tracking-wide inline-block"
            style={{ textShadow: '0 0 4px rgba(17, 17, 68, 0.2)' }}
          >
            {date}
          </span>
        ) : null}
        {formatDescription(description)}
      </div>
    </div>
  );
};

export default TimelineItem;
