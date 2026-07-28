import React from 'react';
import SectionCard from './SectionCard';
import StatusBadge from './StatusBadge';

export interface ChiefComplaintsCardProps {
  complaints: string[];
  since: string;
}

const ChiefComplaintsCard: React.FC<ChiefComplaintsCardProps> = ({ complaints, since }) => {
  return (
    <SectionCard title="Chief Complaints" subtitle={`Since ${since}`} className="mb-6">
      <div className="flex flex-wrap gap-2">
        {complaints.map((complaint, index) => (
          <StatusBadge key={index} label={complaint} variant="warning" className="bg-orange-50 text-orange-700" />
        ))}
      </div>
    </SectionCard>
  );
};

export default ChiefComplaintsCard;
