import React from 'react';
import SectionCard from './SectionCard';
import StatusBadge from './StatusBadge';
import VitalItem from './VitalItem';
import { Droplets, Weight, Ruler, AlertCircle } from 'lucide-react';

export interface PatientInfoProps {
  patient: {
    name: string;
    age: number;
    gender: string;
    initials: string;
    tag: string;
    vitals: {
      bloodGroup: string;
      weight: string;
      height: string;
      allergies: number;
    }
  }
}

const PatientInfoCard: React.FC<PatientInfoProps> = ({ patient }) => {
  return (
    <SectionCard className="mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-habanero text-white flex items-center justify-center text-2xl font-bold shadow-md shrink-0">
            {patient.initials}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-deep-space mb-1">{patient.name}</h2>
            <p className="text-sm text-aster-blue mb-2">
              {patient.age} years • {patient.gender}
            </p>
            <StatusBadge label={patient.tag} variant="primary" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 lg:gap-6 bg-gray-50/50 p-4 rounded-xl border border-jodhpur-tan/10">
          <VitalItem icon={Droplets} value={patient.vitals.bloodGroup} label="Blood Group" iconColorClass="text-red-500 bg-red-50" />
          <div className="hidden sm:block w-px h-10 bg-jodhpur-tan/30"></div>
          <VitalItem icon={Weight} value={patient.vitals.weight} label="Weight" iconColorClass="text-habanero bg-habanero/10" />
          <div className="hidden sm:block w-px h-10 bg-jodhpur-tan/30"></div>
          <VitalItem icon={Ruler} value={patient.vitals.height} label="Height" iconColorClass="text-blue-500 bg-blue-50" />
          <div className="hidden sm:block w-px h-10 bg-jodhpur-tan/30"></div>
          <VitalItem icon={AlertCircle} value={patient.vitals.allergies.toString()} label="Allergies" iconColorClass="text-red-500 bg-red-50" />
        </div>
      </div>
    </SectionCard>
  );
};

export default PatientInfoCard;
