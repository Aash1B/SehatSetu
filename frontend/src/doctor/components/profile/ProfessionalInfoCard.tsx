import React from 'react';
import SectionCard from '../SectionCard';
import { DoctorProfileData } from '../../types/profile.types';
import { Award, BookOpen, Languages, ShieldCheck } from 'lucide-react';

interface Props {
  profile: DoctorProfileData;
  isEditing?: boolean;
  onChange?: (field: keyof DoctorProfileData, value: any) => void;
}

const ProfessionalInfoCard: React.FC<Props> = ({ profile, isEditing, onChange }) => {
  const inputClassName = "w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-deep-space focus:outline-none focus:ring-2 focus:ring-aster-blue/50 focus:border-aster-blue transition-colors";

  return (
    <SectionCard title="Professional Information" className="h-full">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-aster-blue/10 rounded-lg text-aster-blue">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Qualification</p>
              {isEditing ? (
                <input 
                  type="text"
                  value={profile.qualification}
                  onChange={(e) => onChange?.('qualification', e.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="text-base text-deep-space font-medium">{profile.qualification}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-aster-blue/10 rounded-lg text-aster-blue">
              <Award className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Specialization</p>
              {isEditing ? (
                <input 
                  type="text"
                  value={profile.specialization}
                  onChange={(e) => onChange?.('specialization', e.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="text-base text-deep-space font-medium">{profile.specialization}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-aster-blue/10 rounded-lg text-aster-blue">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Medical License</p>
              {isEditing ? (
                <input 
                  type="text"
                  value={profile.medicalLicenseNumber}
                  onChange={(e) => onChange?.('medicalLicenseNumber', e.target.value)}
                  className={inputClassName}
                />
              ) : (
                <p className="text-base text-deep-space font-medium">{profile.medicalLicenseNumber}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="p-2 bg-aster-blue/10 rounded-lg text-aster-blue">
              <Languages className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500 font-medium">Languages</p>
              {isEditing ? (
                <input 
                  type="text"
                  value={profile.languagesSpoken.join(', ')}
                  onChange={(e) => onChange?.('languagesSpoken', e.target.value.split(',').map(s => s.trim()))}
                  className={inputClassName}
                  placeholder="Comma separated"
                />
              ) : (
                <p className="text-base text-deep-space font-medium">{profile.languagesSpoken.join(', ')}</p>
              )}
            </div>
          </div>
        </div>
        
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-base font-bold text-deep-space mb-2">About Me</h4>
          {isEditing ? (
            <textarea 
              value={profile.aboutMe}
              onChange={(e) => onChange?.('aboutMe', e.target.value)}
              className={inputClassName}
              rows={4}
            />
          ) : (
            <p className="text-base text-gray-600 leading-relaxed">
              {profile.aboutMe}
            </p>
          )}
        </div>
      </div>
    </SectionCard>
  );
};

export default ProfessionalInfoCard;
