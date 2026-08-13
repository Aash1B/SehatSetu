import React from 'react';
import SectionCard from '../SectionCard';
import { DoctorProfileData } from '../../types/profile.types';

interface Props {
  profile: DoctorProfileData;
  isEditing?: boolean;
  onChange?: (field: keyof DoctorProfileData, value: any) => void;
}

const ProfessionalInfoCard: React.FC<Props> = ({ profile, isEditing, onChange }) => {
  const inputClassName =
    'w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-deep-space focus:outline-none focus:ring-2 focus:ring-aster-blue/50 focus:border-aster-blue transition-colors';

  return (
    <SectionCard>
      {/* Two inner sections side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">

        {/* ── Left: 4 qualification fields stacked ── */}
        <div className="flex flex-col gap-5 pr-0 md:pr-8 pb-6 md:pb-0">
          {/* Qualification */}
          <div>
            <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Qualification</p>
            {isEditing ? (
              <input
                type="text"
                value={profile.qualification}
                onChange={(e) => onChange?.('qualification', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-lg font-bold text-deep-space mt-0.5">{profile.qualification || '—'}</p>
            )}
          </div>

          {/* Specialization */}
          <div>
            <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Specialization</p>
            {isEditing ? (
              <input
                type="text"
                value={profile.specialization}
                onChange={(e) => onChange?.('specialization', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-lg font-bold text-deep-space mt-0.5">{profile.specialization || '—'}</p>
            )}
          </div>

          {/* Medical License */}
          <div>
            <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Medical License</p>
            {isEditing ? (
              <input
                type="text"
                value={profile.medicalLicenseNumber}
                onChange={(e) => onChange?.('medicalLicenseNumber', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-lg font-bold text-deep-space mt-0.5">{profile.medicalLicenseNumber || '—'}</p>
            )}
          </div>

          {/* Languages */}
          <div>
            <p className="text-sm text-gray-400 font-semibold uppercase tracking-wider">Languages</p>
            {isEditing ? (
              <input
                type="text"
                value={profile.languagesSpoken.join(', ')}
                onChange={(e) =>
                  onChange?.('languagesSpoken', e.target.value.split(',').map((s) => s.trim()))
                }
                className={inputClassName}
                placeholder="Comma separated"
              />
            ) : (
              <p className="text-lg font-bold text-deep-space mt-0.5">
                {profile.languagesSpoken.join(', ') || '—'}
              </p>
            )}
          </div>
        </div>

        {/* ── Right: About Me ── */}
        <div className="flex flex-col pt-6 md:pt-0 md:pl-8">
          <p className="text-xl font-black text-slate-900 tracking-tight mb-3">About Me</p>
          {isEditing ? (
            <textarea
              value={profile.aboutMe}
              onChange={(e) => onChange?.('aboutMe', e.target.value)}
              className={`${inputClassName} flex-1 resize-none text-xl`}
              rows={7}
              placeholder="Write a short bio about yourself..."
            />
          ) : (
            <p className="text-xl text-gray-600 leading-relaxed whitespace-pre-line">
              {profile.aboutMe || 'No bio added yet.'}
            </p>
          )}
        </div>

      </div>
    </SectionCard>
  );
};

export default ProfessionalInfoCard;
