import React, { useState } from 'react';
import { BadgeAlert, FileText, History as HistoryIcon, UserRound } from 'lucide-react';
import type { PatientProfile } from '../../types';

interface PatientMiniCardProps {
  patient: PatientProfile;
  consultationCount?: number;
  consultationSummary?: string;
  chiefComplaint?: string;
}

const PatientMiniCard: React.FC<PatientMiniCardProps> = ({
  patient,
  consultationCount = 1,
  consultationSummary,
  chiefComplaint = 'General medical consultation',
}) => {
  const [showOverview, setShowOverview] = useState(true);
  const visitCount = Math.max(1, consultationCount);
  const visitLabel = `${visitCount} ${visitCount === 1 ? 'Visit' : 'Visits'}`;
  const genderLabel = patient.gender === 'F' ? 'Female' : patient.gender === 'M' ? 'Male' : 'Other';

  return (
    <div className="mb-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#223382]/10 text-lg font-bold text-[#223382]">
            {patient.initials}
          </div>
          <div>
            <div className="flex items-center gap-6">
              <h3 className="text-base font-bold leading-tight text-deep-space">{patient.name}</h3>
              <button
                type="button"
                onClick={() => setShowOverview(!showOverview)}
                className={`cursor-pointer rounded-full border px-2 py-0.5 text-[10px] font-extrabold transition-all ${
                  showOverview
                    ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                    : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'
                }`}
                title="Click to toggle the patient history view"
              >
                {showOverview ? 'History' : 'Consultation History'}
              </button>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {patient.age} Yrs <span aria-hidden="true">•</span> {genderLabel}
            </p>
          </div>
        </div>
        <span className="text-sm font-normal text-purple-700">
          {visitLabel}
        </span>
      </div>

      {showOverview ? (
        <div className="animate-in space-y-1.5 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-amber-900">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <HistoryIcon className="h-3.5 w-3.5 text-amber-600" />
              History Summary
            </span>
          </div>
          <div className="flex items-start gap-1.5 text-amber-950">
            <UserRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700" />
            <p className="font-medium leading-relaxed">
              <span className="font-bold text-amber-900">Patient Overview: </span>
              {patient.age}yr old {genderLabel}, Wt: {patient.weight || 'Not recorded'}, Ht: {patient.height || 'Not recorded'}, Blood Group: {patient.bloodGroup || 'Not recorded'}. {visitLabel} recorded for this patient.
            </p>
          </div>
          <div className="flex items-center gap-1.5 border-t border-amber-200/60 pt-1 text-[11px] font-medium text-amber-900">
            <BadgeAlert className="h-3.5 w-3.5 shrink-0 text-amber-700" />
            <span>
              Chief Complaint: <span className="font-semibold">{chiefComplaint}</span>
            </span>
          </div>
        </div>
      ) : (
        <div className="animate-in space-y-1.5 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-xs fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-amber-900">
            <span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
              <FileText className="h-3.5 w-3.5 text-amber-600" />
              Consultation History
            </span>
          </div>
          <p className="font-medium leading-relaxed text-amber-950">
            {consultationSummary || `This patient has ${visitLabel.toLowerCase()} recorded. Review the consultation notes and current symptoms before continuing.`}
          </p>
        </div>
      )}
    </div>
  );
};

export default PatientMiniCard;
