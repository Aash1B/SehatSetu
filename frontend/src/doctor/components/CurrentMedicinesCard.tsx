import React from 'react';
import SectionCard from './SectionCard';
import MedicineItem from './MedicineItem';

export interface MedicineType {
  name: string;
  dosage: string;
  frequency: string;
}

export interface CurrentMedicinesCardProps {
  medicines: MedicineType[];
  allergies?: string[];
}

const CurrentMedicinesCard: React.FC<CurrentMedicinesCardProps> = ({ medicines }) => {
  return (
    <SectionCard title="Current Medicines" className="mb-6">
      {medicines && medicines.length > 0 ? (
        <div className="flex flex-col">
          {medicines.map((med, index) => (
            <MedicineItem key={index} {...med} />
          ))}
        </div>
      ) : (
        <p className="text-base md:text-lg font-bold text-slate-600 -mt-2 -ml-0.5">
          No ongoing medicines
        </p>
      )}
    </SectionCard>
  );
};

export default CurrentMedicinesCard;
