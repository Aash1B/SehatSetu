import React from 'react';
import SectionCard from './SectionCard';
import StatusBadge from './StatusBadge';
import TimelineItem from './TimelineItem';

export interface HistoryEvent {
  date: string;
  description: string;
}

export interface MedicalHistoryCardProps {
  conditions: string[];
  history: HistoryEvent[];
}

const MedicalHistoryCard: React.FC<MedicalHistoryCardProps> = ({ conditions, history }) => {
  return (
    <SectionCard title="Medical History" className="mb-6">
      <div className="flex flex-wrap gap-2 mb-6">
        {conditions.map((condition, index) => (
          <StatusBadge key={index} label={condition} variant="default" className="bg-blue-50 text-blue-700 font-medium" />
        ))}
      </div>
      
      <div className="ml-1">
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
