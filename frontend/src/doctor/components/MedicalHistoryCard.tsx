import React from 'react';
import SectionCard from './SectionCard';
import TimelineItem from './TimelineItem';

export interface HistoryEvent {
  date: string;
  description: string;
}

export interface MedicalHistoryCardProps {
  conditions?: string[];
  history: HistoryEvent[];
}

const MedicalHistoryCard: React.FC<MedicalHistoryCardProps> = ({ history }) => {
  return (
    <SectionCard title="Medical History" className="mb-6">
      <div className="ml-1 pt-2">
        {history.map((event, index) => (
          <TimelineItem 
            key={index} 
            date={event.date} 
            description={event.description} 
            isLast={index === history.length - 1} 
          />
        ))}
      </div>
    </SectionCard>
  );
};

export default MedicalHistoryCard;
