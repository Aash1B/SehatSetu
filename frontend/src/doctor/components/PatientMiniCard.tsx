import React, { useState } from 'react';
import { Sparkles, FileText, BadgeAlert } from 'lucide-react';
import type { PatientProfile } from '../../types';

interface PatientMiniCardProps {
  patient: PatientProfile;
  isFirstConsultation?: boolean;
  consultationSummary?: string;
  chiefComplaint?: string;
}

const PatientMiniCard: React.FC<PatientMiniCardProps> = ({
  patient,
  isFirstConsultation = true,
  consultationSummary,
  chiefComplaint = "High fever (4 days) & muscle pain"
}) => {
  const [isFirst, setIsFirst] = useState(isFirstConsultation);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 transition-all">
      {/* Patient Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-orange-400 to-habanero text-white flex items-center justify-center font-bold text-sm shadow-sm">
            {patient.initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-deep-space text-base leading-tight">{patient.name}</h3>
              <button
                type="button"
                onClick={() => setIsFirst(!isFirst)}
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                  isFirst
                    ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                    : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                }`}
                title="Click to toggle First / Follow-up view preview"
              >
                {isFirst ? '⭐ 1st Consultation' : '🔄 Follow-up #2'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {patient.age} Yrs • {patient.gender === 'F' ? 'Female' : patient.gender === 'M' ? 'Male' : 'Other'}
            </p>
          </div>
        </div>
      </div>

      {/* Consultation Summary Block */}
      <div>
        {isFirst ? (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-xl p-3 text-xs space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between font-bold text-amber-900">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                First Consultation Summary
              </span>
              <span className="text-[10px] text-amber-700 font-normal bg-amber-200/60 px-1.5 py-0.5 rounded">New Patient</span>
            </div>
            <p className="text-amber-950 font-medium leading-relaxed">
              <span className="font-bold text-amber-900">Patient Overview: </span>
              {patient.age}yr old {patient.gender === 'F' ? 'Female' : 'Male'}, Wt: {patient.weight || '58kg'}, Ht: {patient.height || '162cm'}, Blood Group: {patient.bloodGroup || 'B+'}. No prior consultation history logged.
            </p>
            <div className="pt-1 border-t border-amber-200/60 text-[11px] text-amber-900 flex items-center gap-1.5 font-medium">
              <BadgeAlert className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>Chief Complaint: <span className="font-semibold">{chiefComplaint}</span></span>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-3 text-xs space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between font-bold text-blue-900">
              <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                Consultation History Summary
              </span>
              <span className="text-[10px] text-blue-700 font-normal bg-blue-200/60 px-1.5 py-0.5 rounded">Visit #2</span>
            </div>
            <p className="text-blue-950 font-medium leading-relaxed">
              {consultationSummary || `Previous Visit (12 days ago): Diagnosed with acute viral fever. Prescribed Paracetamol 650mg and Cetirizine. Patient reporting mild fever recurrence with fatigue.`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientMiniCard;
