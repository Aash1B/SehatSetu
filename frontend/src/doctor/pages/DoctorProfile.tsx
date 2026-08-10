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
import { getDoctorProfileData } from '../utils/doctorProfile';
import { getToken } from '../../auth/authStorage';
import { LiquidLoader } from '../../common/components/LiquidLoader';

const DoctorProfile: React.FC = () => {
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<DoctorProfileData | null>(null);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const storedProfile = getDoctorProfileData();
      const response = await fetch('/api/doctors/me', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error('Unable to load doctor profile');
      const doctor = await response.json();
      // Also fetch the full availability record (canonical document source)
      const availRes = await fetch(`/api/doctor/${doctor.id}/availability`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      let freshDocs: any[] = [];
      if (availRes.ok) {
        const fullAvail = await availRes.json();
        if (Array.isArray(fullAvail?.documents) && fullAvail.documents.length > 0) {
          freshDocs = fullAvail.documents;
        }
      }

      const actualProfile: DoctorProfileData = {
        ...storedProfile,
        id: doctor.id,
        fullName: doctor.user?.fullName || doctor.name || storedProfile.fullName,
        specialization: doctor.specialty || storedProfile.specialization,
        qualification: doctor.degrees || storedProfile.qualification,
        yearsOfExperience: Number.parseInt(String(doctor.experience || storedProfile.yearsOfExperience), 10) || 0,
        photoUrl: doctor.imageUrl || storedProfile.photoUrl,
        email: doctor.user?.email || storedProfile.email,
        clinicName: doctor.hospital || storedProfile.clinicName,
        address: doctor.location || storedProfile.address,
        languagesSpoken: Array.isArray(doctor.tags) && doctor.tags.length ? doctor.tags : storedProfile.languagesSpoken,
        medicalLicenseNumber: availability.medicalLicenseNumber || '',
        phoneNumber: availability.phoneNumber || '',
        aboutMe: availability.aboutMe || '',
        availability: {
          slots: Array.isArray(availability.slots) ? availability.slots : storedProfile.availability.slots,
          slotDurationMinutes: availability.slotDurationMinutes || storedProfile.availability.slotDurationMinutes,
          status: availability.status || storedProfile.availability.status,
        },
        // Prefer freshly fetched docs, fall back to those embedded in availability
        documents: freshDocs.length > 0 ? freshDocs
          : Array.isArray(availability.documents) ? availability.documents : [],
        isVerified: (freshDocs.length > 0 ? freshDocs : (availability.documents || [])).length >= 3,
        stats: doctor.stats,
      };
      setProfile(actualProfile);
      setFormData(actualProfile);
    } catch (error) {
      console.error('Failed to load doctor profile', error);
      const fallback = getDoctorProfileData();
      const unavailableProfile = {
        ...fallback,
        stats: {
          totalConsultations: 0,
          patientsTreated: 0,
          todaysAppointments: 0,
          completedConsultations: 0,
        },
      };
      setProfile(unavailableProfile);
      setFormData(unavailableProfile);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();

    const handleDoctorChange = () => {
      void loadProfile();
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
    if (!formData) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/doctor/${formData.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...formData,
          availability: {
            ...formData.availability,
            aboutMe: formData.aboutMe,
            medicalLicenseNumber: formData.medicalLicenseNumber,
            phoneNumber: formData.phoneNumber,
            documents: formData.documents,
          },
        }),
      });
      if (!response.ok) throw new Error('Unable to save doctor profile');
      setProfile(formData);
      setIsEditing(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: keyof DoctorProfileData, value: any) => {
    if (formData) {
      setFormData({ ...formData, [field]: value });
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-luster-white">
        <LiquidLoader text="Loading Profile" />
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
          <p className="text-base font-bold text-aster-blue uppercase tracking-wider mb-2">Performance & Activity</p>
          <StatisticsGrid stats={profile.stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <p className="text-base font-bold text-aster-blue uppercase tracking-wider mb-2">Professional Details</p>
              <ProfessionalInfoCard 
                profile={formData || profile} 
                isEditing={isEditing}
                onChange={handleChange}
              />
            </div>
            <div>
              <p className="text-base font-bold text-aster-blue uppercase tracking-wider mb-2">Verification & Documents</p>
              <DocumentCard documents={profile.documents} />
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <p className="text-base font-bold text-aster-blue uppercase tracking-wider mb-2">Contact Info</p>
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
