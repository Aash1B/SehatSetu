import React from 'react';
import SectionCard from './SectionCard';
import TimelineItem from './TimelineItem';
import { Star } from 'lucide-react';

export interface HistoryEvent {
  date: string;
  description: string;
}

export interface MedicalHistoryCardProps {
  conditions?: string[];
  history: HistoryEvent[];
}

const MedicalHistoryCard: React.FC<MedicalHistoryCardProps> = ({ history }) => {
  const firstDate = history.length > 0 ? history[0].date : null;

  return (
    <SectionCard 
      title="Medical History" 
      headerRight={
        firstDate ? (
          <span 
            className="flex items-center gap-1.5 text-sm md:text-base font-bold text-[#111144] tracking-wide"
            style={{ textShadow: '0 0 4px rgba(17, 17, 68, 0.2)' }}
          >
            <Star className="w-3.5 h-3.5 text-[#111144] fill-[#111144] shrink-0" />
            {firstDate}
          </span>
        ) : null
      }
      className="mb-6"
    >
      <div className="-mt-3">
        {history.map((event, index) => (
          <TimelineItem 
            key={index} 
            date={index === 0 ? undefined : event.date} 
            description={event.description} 
            isLast={index === history.length - 1} 
          />
        ))}
      </div>
    </SectionCard>
  );
};

export default MedicalHistoryCard;
