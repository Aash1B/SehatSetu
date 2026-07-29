import React from 'react';
import { Activity, Droplets, Ruler, Weight } from 'lucide-react';
import type { PatientProfile } from '../../types';

interface PatientMiniCardProps {
  patient: PatientProfile;
}

const PatientMiniCard: React.FC<PatientMiniCardProps> = ({ patient }) => {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-habanero/10 text-habanero flex items-center justify-center font-bold">
          {patient.initials}
        </div>
        <div>
          <h3 className="font-bold text-deep-space leading-tight">{patient.name}</h3>
          <p className="text-xs text-gray-500">
            {patient.age} Yrs • {patient.gender === 'F' ? 'Female' : patient.gender === 'M' ? 'Male' : 'Other'}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <Droplets className="w-4 h-4 text-red-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-medium uppercase">Blood Group</span>
            <span className="text-xs font-bold text-deep-space">{patient.bloodGroup || '-'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <Weight className="w-4 h-4 text-blue-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-medium uppercase">Weight</span>
            <span className="text-xs font-bold text-deep-space">{patient.weight || '-'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <Ruler className="w-4 h-4 text-green-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-medium uppercase">Height</span>
            <span className="text-xs font-bold text-deep-space">{patient.height || '-'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
          <Activity className="w-4 h-4 text-purple-500" />
          <div className="flex flex-col">
            <span className="text-[10px] text-gray-500 font-medium uppercase">Allergies</span>
            <span className="text-xs font-bold text-deep-space">2 Known</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientMiniCard;
