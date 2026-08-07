import React from 'react';
import { CheckCircle2, Edit2 } from 'lucide-react';
import SectionCard from '../SectionCard';
import { DoctorProfileData } from '../../types/profile.types';

interface Props {
  profile: DoctorProfileData;
  isEditing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
}

const DoctorProfileHeader: React.FC<Props> = ({ profile, isEditing, onEdit, onCancel, onSave }) => {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-jodhpur-tan/30 mb-8 flex flex-col md:flex-row items-start md:items-center gap-6">
      <div className="relative shrink-0">
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt={profile.fullName} className="w-24 h-24 rounded-full object-cover border border-jodhpur-tan/30 shadow-sm" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-2xl font-bold border border-indigo-200">
            {profile.fullName.replace(/^Dr\.\s*/i, '').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
        {profile.isVerified && (
          <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
            <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-50" />
          </div>
        )}
      </div>
      
      <div className="flex-1 w-full">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
          <div>
            <h2 className="text-xl font-bold text-deep-space flex items-center gap-2 mb-2">
              {profile.fullName}
            </h2>
            <div className="mb-3">
              <span className="text-sm font-medium bg-habanero/10 text-habanero px-3 py-1 rounded-full">
                {profile.specialization}
              </span>
            </div>
            <div className="text-sm text-gray-600 flex flex-wrap gap-x-4 gap-y-2 font-medium">
              <p>Qualification: <span className="text-deep-space">{profile.qualification}</span></p>
              <p>Experience: <span className="text-deep-space">{profile.yearsOfExperience} Years</span></p>
              <p>Doctor ID: <span className="text-deep-space">{profile.id}</span></p>
            </div>
          </div>
          
          {isEditing ? (
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={onCancel}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-6 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                Cancel
              </button>
              <button 
                onClick={onSave}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <a
                href="/doctor/onboarding"
                className="bg-aster-blue hover:bg-aster-blue/90 text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                Onboarding Setup
              </a>
              <button 
                onClick={onEdit}
                className="bg-habanero hover:bg-[#e0750e] text-white px-5 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DoctorProfileHeader;
