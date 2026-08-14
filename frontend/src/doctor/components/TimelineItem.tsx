import React from 'react';

export interface TimelineItemProps {
  date: string;
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
        <ul className="space-y-2 mt-2">
          {parts.map((part, idx) => {
            const match = part.match(/^(Symptoms|Duration|Severity|Notes):\s*(.*)/i);
            if (match) {
              const label = match[1];
              let value = match[2].trim();
              if (value === 'lessThanDay') value = '< 1 Day';
              return (
                <li key={idx} className="flex items-start gap-2.5 text-sm md:text-base text-slate-700 font-medium">
                  <span className="w-2 h-2 rounded-full bg-[#223382] shrink-0 mt-2" />
                  <div>
                    <span className="font-extrabold text-slate-900">{label}:</span>{' '}
                    <span className="text-slate-800 font-semibold">{value}</span>
                  </div>
                </li>
              );
            }
            return (
              <li key={idx} className="flex items-start gap-2.5 text-sm md:text-base text-slate-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-[#223382] shrink-0 mt-2" />
                <span className="text-slate-800 font-semibold">{part.trim()}</span>
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
        <ul className="space-y-2 mt-2">
          {lines.map((line, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-sm md:text-base text-slate-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-[#223382] shrink-0 mt-2" />
              <span className="text-slate-800 font-semibold">{line.trim()}</span>
            </li>
          ))}
        </ul>
      );
    }

    return (
      <ul className="space-y-2 mt-2">
        <li className="flex items-start gap-2.5 text-sm md:text-base text-slate-700 font-medium">
          <span className="w-2 h-2 rounded-full bg-[#223382] shrink-0 mt-2" />
          <span className="text-slate-800 font-semibold">{text}</span>
        </li>
      </ul>
    );
  };

  return (
    <div className="relative pl-6 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[7px] top-2 bottom-0 w-px bg-slate-200"></div>
      )}
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-[3px] border-white bg-[#223382] shadow-xs"></div>

      <div className="flex flex-col gap-1">
        <span className="text-sm font-extrabold text-slate-900 tracking-wide">{date}</span>
        {formatDescription(description)}
      </div>
    </div>
  );
};

export default TimelineItem;
