import React, { useRef } from 'react';
import { CheckCircle2, Edit2 } from 'lucide-react';
import { DoctorProfileData } from '../../types/profile.types';

interface Props {
  profile: DoctorProfileData;
  isEditing?: boolean;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  onPhotoChange?: (file: File) => void;
}

const DoctorProfileHeader: React.FC<Props> = ({ profile, isEditing, onEdit, onCancel, onSave, onPhotoChange }) => {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) onPhotoChange?.(file);
  };

  return (
    <div className="bg-gradient-to-r from-[#223382]/60 via-[#223382]/30 to-white p-4 rounded-2xl shadow-sm border border-[#223382]/10 mb-8 flex flex-col md:flex-row items-start md:items-center gap-4">
      <div className="relative shrink-0">
        {/* Hidden file input always present */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleImageSelected}
        />

        {/* Photo */}
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt={profile.fullName} className="w-14 h-14 rounded-full object-cover border border-jodhpur-tan/30 shadow-sm" />
        ) : (
          <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center text-lg font-bold border border-indigo-200">
            {profile.fullName.replace(/^Dr\.\s*/i, '').split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}

        {/* Verified badge (non-edit mode) */}
        {!isEditing && profile.isVerified && (
          <div className="absolute bottom-0 right-0 bg-white rounded-full p-0.5 shadow-sm border border-gray-100">
            <CheckCircle2 className="w-5 h-5 text-green-500 fill-green-50" />
          </div>
        )}

        {/* Pencil overlay (edit mode) */}
        {isEditing && (
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="absolute inset-0 w-14 h-14 rounded-full bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            title="Change photo"
          >
            <Edit2 className="w-4 h-4 text-white" />
          </button>
        )}
      </div>
      
      <div className="flex-1 w-full">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
              {profile.fullName}
            </h2>


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
