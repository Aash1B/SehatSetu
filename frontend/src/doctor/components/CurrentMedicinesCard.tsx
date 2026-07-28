import React from 'react';
import SectionCard from './SectionCard';
import MedicineItem from './MedicineItem';
import StatusBadge from './StatusBadge';

export interface MedicineType {
  name: string;
  dosage: string;
  frequency: string;
}

export interface CurrentMedicinesCardProps {
  medicines: MedicineType[];
  allergies: string[];
}

const CurrentMedicinesCard: React.FC<CurrentMedicinesCardProps> = ({ medicines, allergies }) => {
  return (
    <SectionCard title="Current Medicines" className="mb-6">
      <div className="flex flex-col mb-6">
        {medicines.map((med, index) => (
          <MedicineItem key={index} {...med} />
        ))}
      </div>
      
      <div>
        <h4 className="text-xs font-bold text-aster-blue uppercase tracking-wider mb-3">Known Allergies</h4>
        <div className="flex flex-wrap gap-2">
          {allergies.map((allergy, index) => (
            <StatusBadge key={index} label={allergy} variant="default" className="border border-red-200 text-red-500 bg-red-50" />
          ))}
          {allergies.length === 0 && <span className="text-sm text-aster-blue">None reported</span>}
        </div>
      </div>
    </SectionCard>
  );
};

export default CurrentMedicinesCard;
