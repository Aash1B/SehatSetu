import React from 'react';
import { Pill } from 'lucide-react';

export interface MedicineItemProps {
  name: string;
  dosage: string;
  frequency: string;
}

const MedicineItem: React.FC<MedicineItemProps> = ({ name, dosage, frequency }) => {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-jodhpur-tan/20 last:border-0">
      <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
        <Pill className="w-4 h-4" />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-bold text-deep-space">
          {name} <span className="text-aster-blue/80 font-normal">{dosage}</span>
        </span>
        <span className="text-xs text-aster-blue">{frequency}</span>
      </div>
    </div>
  );
};

export default MedicineItem;
