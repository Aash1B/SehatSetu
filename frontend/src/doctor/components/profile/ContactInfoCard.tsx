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
    <SectionCard title="Contact Information" className="h-full">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="p-2 bg-white rounded shadow-sm text-aster-blue">
            <Mail className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Email Address</p>
            {isEditing ? (
              <input 
                type="email"
                value={profile.email}
                onChange={(e) => onChange?.('email', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-sm font-medium text-deep-space">{profile.email}</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="p-2 bg-white rounded shadow-sm text-aster-blue">
            <Phone className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Phone Number</p>
            {isEditing ? (
              <input 
                type="tel"
                value={profile.phoneNumber}
                onChange={(e) => onChange?.('phoneNumber', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-sm font-medium text-deep-space">{profile.phoneNumber}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="p-2 bg-white rounded shadow-sm text-aster-blue">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Primary Clinic/Hospital</p>
            {isEditing ? (
              <input 
                type="text"
                value={profile.clinicName}
                onChange={(e) => onChange?.('clinicName', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-sm font-medium text-deep-space">{profile.clinicName}</p>
            )}
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="p-2 bg-white rounded shadow-sm text-aster-blue shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="flex-1">
            <p className="text-xs text-gray-500">Address</p>
            {isEditing ? (
              <input 
                type="text"
                value={profile.address}
                onChange={(e) => onChange?.('address', e.target.value)}
                className={inputClassName}
              />
            ) : (
              <p className="text-sm font-medium text-deep-space">{profile.address}</p>
            )}
          </div>
        </div>
      </div>
    </SectionCard>
  );
};

export default ContactInfoCard;
