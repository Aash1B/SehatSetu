import React from 'react';
import SectionCard from '../SectionCard';
import { DoctorProfileData } from '../../types/profile.types';
import { Building2, Mail, MapPin, Phone } from 'lucide-react';

interface Props {
  profile: DoctorProfileData;
  isEditing?: boolean;
  onChange?: (field: keyof DoctorProfileData, value: any) => void;
}

const ContactInfoCard: React.FC<Props> = ({ profile, isEditing, onChange }) => {
  const inputClassName = "w-full mt-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-deep-space focus:outline-none focus:ring-2 focus:ring-aster-blue/50 focus:border-aster-blue transition-colors";

  return (
    <SectionCard>
      <div className="space-y-3.5">
        <div className="flex items-start sm:items-center gap-3 p-3 sm:p-3.5 bg-gray-50 rounded-xl overflow-hidden">
          <div className="p-2 bg-white rounded-lg shadow-2xs text-aster-blue shrink-0 mt-0.5 sm:mt-0">
            <Mail className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Email Address</p>
            {isEditing ? (
              <input 
                type="email"
                value={profile.email}
                onChange={(e) => onChange?.('email', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-sm sm:text-base font-semibold text-deep-space break-all leading-snug mt-0.5">
                {profile.email}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-start sm:items-center gap-3 p-3 sm:p-3.5 bg-gray-50 rounded-xl overflow-hidden">
          <div className="p-2 bg-white rounded-lg shadow-2xs text-aster-blue shrink-0 mt-0.5 sm:mt-0">
            <Phone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Phone Number</p>
            {isEditing ? (
              <input 
                type="tel"
                value={profile.phoneNumber}
                onChange={(e) => onChange?.('phoneNumber', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-sm sm:text-base font-semibold text-deep-space break-words leading-snug mt-0.5">
                {profile.phoneNumber}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start sm:items-center gap-3 p-3 sm:p-3.5 bg-gray-50 rounded-xl overflow-hidden">
          <div className="p-2 bg-white rounded-lg shadow-2xs text-aster-blue shrink-0 mt-0.5 sm:mt-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Primary Clinic/Hospital</p>
            {isEditing ? (
              <input 
                type="text"
                value={profile.clinicName}
                onChange={(e) => onChange?.('clinicName', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-sm sm:text-base font-semibold text-deep-space break-words leading-snug mt-0.5">
                {profile.clinicName}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 sm:p-3.5 bg-gray-50 rounded-xl overflow-hidden">
          <div className="p-2 bg-white rounded-lg shadow-2xs text-aster-blue shrink-0 mt-0.5">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm text-gray-500 font-medium">Address</p>
            {isEditing ? (
              <input 
                type="text"
                value={profile.address}
                onChange={(e) => onChange?.('address', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-sm sm:text-base font-semibold text-deep-space break-words leading-snug mt-0.5">
                {profile.address}
              </p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default ContactInfoCard;
