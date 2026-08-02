import React, { useEffect, useState } from 'react';
import DoctorSidebar from '../components/DoctorSidebar';
import DashboardHeader from '../components/DashboardHeader';
import DoctorProfileHeader from '../components/profile/DoctorProfileHeader';
import ProfessionalInfoCard from '../components/profile/ProfessionalInfoCard';
import ContactInfoCard from '../components/profile/ContactInfoCard';
import StatisticsGrid from '../components/profile/StatisticsGrid';
import SettingsCard from '../components/profile/SettingsCard';
import DocumentCard from '../components/profile/DocumentCard';
import { DoctorProfileData } from '../types/profile.types';
import { getActiveDoctor, getDoctorProfileData, type DoctorProfile as ActiveDoc } from '../utils/doctorProfile';

const DoctorProfile: React.FC = () => {
  const [activeDoc, setActiveDoc] = useState<ActiveDoc>(getActiveDoctor());
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<DoctorProfileData | null>(null);

  const loadProfile = () => {
    setIsLoading(true);
    const docData = getDoctorProfileData();
    setProfile(docData);
    setFormData(docData);
    setActiveDoc(getActiveDoctor());
    setIsLoading(false);
  };

  useEffect(() => {
    loadProfile();

    const handleDoctorChange = () => {
      loadProfile();
    };

    window.addEventListener('sehat_doctor_changed', handleDoctorChange);
    return () => window.removeEventListener('sehat_doctor_changed', handleDoctorChange);
  }, []);

  const handleEdit = () => {
    setIsEditing(true);
    setFormData(profile);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(profile); // Revert changes
  };

  const handleSave = async () => {
    // Simulate API call to save data
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setProfile(formData);
    setIsEditing(false);
    setIsLoading(false);
  };

  const handleChange = (field: keyof DoctorProfileData, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-luster-white">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-aster-blue"></div>
      </div>
    );
  }

  const dashboardDoctor = profile ? {
    id: profile.id,
    name: profile.fullName,
    initials: profile.fullName.split(' ').map(n => n[0]).join('').substring(0, 2),
    specialization: profile.specialization
  } : { id: '', name: '', initials: '' };

  return (
    <div className="flex h-screen bg-luster-white font-sans text-deadly-depths">
      <DoctorSidebar />

      <main className="flex-1 overflow-y-auto p-8 relative">
        <DashboardHeader 
          doctor={dashboardDoctor as any}
          date={new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          notificationCount={3}
          className="mb-8"
        />

        <DoctorProfileHeader 
          profile={formData || profile} 
          isEditing={isEditing}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onSave={handleSave}
        />

        <div className="mb-6">
          <p className="text-xs font-bold text-aster-blue uppercase tracking-wider mb-2">Performance & Activity</p>
          <StatisticsGrid stats={profile.stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-xs font-bold text-aster-blue uppercase tracking-wider mb-2">Professional Details</p>
              <ProfessionalInfoCard 
                profile={formData || profile} 
                isEditing={isEditing}
                onChange={handleChange}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-aster-blue uppercase tracking-wider mb-2">Verification & Documents</p>
              <DocumentCard documents={profile.documents} />
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <p className="text-xs font-bold text-aster-blue uppercase tracking-wider mb-2">Contact Info</p>
              <ContactInfoCard 
                profile={formData || profile}
                isEditing={isEditing}
                onChange={handleChange}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-aster-blue uppercase tracking-wider mb-2">Preferences</p>
              <SettingsCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorProfile;
