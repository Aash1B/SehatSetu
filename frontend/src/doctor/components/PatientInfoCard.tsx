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
          <div className="w-px h-12 bg-slate-200 shrink-0 mx-1"></div>
          <div className="flex flex-col justify-center">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">{patient.name}</h2>
            <p className="text-sm md:text-base font-semibold text-slate-500 mt-1">
              {patient.age} years • {patient.gender}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-5 lg:gap-8 bg-gray-50/70 p-5 md:p-6 rounded-2xl border border-slate-200/80">
          <VitalItem icon={Droplets} value={patient.vitals.bloodGroup} label="Blood Group" iconColorClass="text-red-500 bg-red-50" />
          <div className="hidden sm:block w-px h-14 bg-slate-200/80"></div>
          <VitalItem icon={Weight} value={patient.vitals.weight} label="Weight" iconColorClass="text-habanero bg-habanero/10" />
          <div className="hidden sm:block w-px h-14 bg-slate-200/80"></div>
          <VitalItem emoji="📏" value={patient.vitals.height} label="Height" iconColorClass="bg-orange-50 text-orange-600" />
          <div className="hidden sm:block w-px h-14 bg-slate-200/80"></div>
          <VitalItem icon={AlertCircle} value={patient.vitals.allergies.toString()} label="Allergies" iconColorClass="text-red-500 bg-red-50" />
        </div>
      </div>
    </SectionCard>
  );
};

export default PatientInfoCard;
