import React from 'react';

export interface TimelineItemProps {
  date: string;
  description: string;
  isLast?: boolean;
}

const TimelineItem: React.FC<TimelineItemProps> = ({ date, description, isLast = false }) => {
  return (
    <div className="relative pl-6 pb-6">
      {/* Timeline line */}
      {!isLast && (
        <div className="absolute left-[7px] top-2 bottom-0 w-px bg-jodhpur-tan/50"></div>
      )}
      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-[3px] border-white bg-aster-blue/60 shadow-sm"></div>
      
      <div className="flex flex-col gap-1">
        <span className="text-xs font-bold text-deep-space">{date}</span>
        <p className="text-sm text-aster-blue/90">{description}</p>
      </div>
    </div>
  );
};

export default TimelineItem;
