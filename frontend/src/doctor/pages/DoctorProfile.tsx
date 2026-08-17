import React, { useEffect, useState } from 'react';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorNavbar from '../components/DoctorNavbar';
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
import { API_BASE_URL } from '../../patient/utils/constants';

const DoctorProfile: React.FC = () => {
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<DoctorProfileData | null>(null);
  const [pendingImage, setPendingImage] = useState<File | null>(null);

  const loadProfile = async () => {
    setIsLoading(true);
    try {
      const storedProfile = getDoctorProfileData();
      const response = await fetch(`${API_BASE_URL}/doctors/me`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!response.ok) throw new Error('Unable to load doctor profile');
      const doctor = await response.json();
      // Also fetch the full availability record (canonical document source)
      const availRes = await fetch(`${API_BASE_URL}/doctor/${doctor.id}/availability`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      let freshDocs: any[] = [];
      let fullAvail: any = null;
      if (availRes.ok) {
        fullAvail = await availRes.json();
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
        medicalLicenseNumber: fullAvail?.medicalLicenseNumber || '',
        phoneNumber: fullAvail?.phoneNumber || '',
        aboutMe: fullAvail?.aboutMe || '',
        availability: {
          slots: Array.isArray(fullAvail?.slots) ? fullAvail.slots : storedProfile.availability.slots,
          slotDurationMinutes: fullAvail?.slotDurationMinutes || storedProfile.availability.slotDurationMinutes,
          status: fullAvail?.status || storedProfile.availability.status,
        },
        // Prefer freshly fetched docs, fall back to those embedded in availability
        documents: freshDocs.length > 0 ? freshDocs
          : Array.isArray(fullAvail?.documents) ? fullAvail.documents : [],
        isVerified: (freshDocs.length > 0 ? freshDocs : (fullAvail?.documents || [])).length >= 3,
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
    setPendingImage(null);
    setFormData(profile);
  };

  const handlePhotoChange = (file: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      window.alert('Please choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert('Profile image size must not exceed 5MB.');
      return;
    }

    if (formData?.photoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.photoUrl);
    }
    setPendingImage(file);
    setFormData(formData ? { ...formData, photoUrl: URL.createObjectURL(file) } : formData);
  };

  const handleCancel = () => {
    if (formData?.photoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(formData.photoUrl);
    }
    setPendingImage(null);
    setIsEditing(false);
    setFormData(profile); // Revert changes
  };

  const handleSave = async () => {
    if (!formData) return;
    setIsLoading(true);
    try {
      const profileToSave: DoctorProfileData = { ...formData };

      if (pendingImage) {
        const imageFormData = new FormData();
        imageFormData.append('image', pendingImage);
        const imageResponse = await fetch(`${API_BASE_URL}/doctor/${formData.id}/profile-image`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: imageFormData,
        });
        if (!imageResponse.ok) throw new Error('Unable to upload doctor profile image');
        const uploadedImage = await imageResponse.json();
        profileToSave.photoUrl = uploadedImage.imageUrl;
      }

      const response = await fetch(`${API_BASE_URL}/doctor/${formData.id}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          ...profileToSave,
          availability: {
            ...profileToSave.availability,
            aboutMe: profileToSave.aboutMe,
            medicalLicenseNumber: profileToSave.medicalLicenseNumber,
            phoneNumber: profileToSave.phoneNumber,
            documents: profileToSave.documents,
          },
        }),
      });
      if (!response.ok) throw new Error('Unable to save doctor profile');

      if (formData.photoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(formData.photoUrl);
      }
      setProfile(profileToSave);
      setFormData(profileToSave);
      setPendingImage(null);
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
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <LiquidLoader text="Loading Profile" />
      </div>
    );
  }

  const dashboardDoctor = profile ? {
    id: profile.id,
    name: profile.fullName,
    initials: profile.fullName.split(' ').map(n => n[0]).join('').substring(0, 2),
    specialization: profile.specialization,
    imageUrl: profile.photoUrl,
  } : { id: '', name: '', initials: '' };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-deadly-depths overflow-hidden">
      <DoctorSidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <DoctorNavbar doctor={dashboardDoctor as any} />

        <main className="flex-1 overflow-y-auto p-8 relative bg-[#F8FAFC]">
          <DoctorProfileHeader 
            profile={formData || profile} 
            isEditing={isEditing}
            onEdit={handleEdit}
            onCancel={handleCancel}
            onSave={handleSave}
            onPhotoChange={handlePhotoChange}
          />

        <div className="mb-8">
          <StatisticsGrid stats={profile.stats} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">Professional Information</h3>
              <ProfessionalInfoCard 
                profile={formData || profile} 
                isEditing={isEditing}
                onChange={handleChange}
              />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">Professional Documents</h3>
              <DocumentCard documents={profile.documents} doctorId={profile.id} onRefresh={loadProfile} />
            </div>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">Contact Information</h3>
              <ContactInfoCard 
                profile={formData || profile}
                isEditing={isEditing}
                onChange={handleChange}
              />
            </div>
            <div>
              <h3 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight mb-4">Account Settings</h3>
              <SettingsCard />
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
);
};

export default DoctorProfile;
