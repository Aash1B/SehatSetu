import React, { useEffect, useState } from 'react';
import DoctorSidebar from '../components/DoctorSidebar';
import DoctorNavbar from '../components/DoctorNavbar';
import DashboardHeader from '../components/DashboardHeader';
import AvailabilityCard from '../components/profile/AvailabilityCard';
import { DoctorProfileData, Availability } from '../types/profile.types';
import { getActiveDoctor, type DoctorProfile as ActiveDoc } from '../utils/doctorProfile';
import { getDoctorProfileData } from '../utils/doctorProfile';
import { getToken } from '../../auth/authStorage';
import { LiquidLoader } from '../../common/components/LiquidLoader';
import { API_BASE_URL } from '../../patient/utils/constants';

const DoctorAvailability: React.FC = () => {
  const [activeDoctor, setActiveDoctor] = useState<ActiveDoc>(getActiveDoctor());
  const [profile, setProfile] = useState<DoctorProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchAvailability = async (docId: string) => {
    setIsLoading(true);
    try {
      const profileResponse = await fetch(`${API_BASE_URL}/doctors/me`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!profileResponse.ok) throw new Error('Unable to load doctor profile');
      const doctor = await profileResponse.json();
      const stored = getDoctorProfileData();
      setProfile({
        ...stored,
        id: doctor.id,
        fullName: doctor.user?.fullName || doctor.name,
        specialization: doctor.specialty,
      });

      const response = await fetch(`${API_BASE_URL}/doctor/${doctor.id}/availability`);
      if (response.ok) {
        const availabilityData = await response.json();
        if (availabilityData) {
          setProfile(prev => prev ? { ...prev, availability: availabilityData } : prev);
        }
      }
    } catch (error) {
      console.error("Error fetching availability:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailability(activeDoctor.id);

    const handleDoctorChange = () => {
      const current = getActiveDoctor();
      setActiveDoctor(current);
      fetchAvailability(current.id);
    };

    window.addEventListener('sehat_doctor_changed', handleDoctorChange);
    return () => window.removeEventListener('sehat_doctor_changed', handleDoctorChange);
  }, []);

  const handleSaveAvailability = async (updatedAvailability: Availability) => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_BASE_URL}/doctor/${activeDoctor.id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(updatedAvailability)
      });

      if (res.ok) {
        const saved = await res.json();
        setProfile(prev => prev ? { ...prev, availability: saved } : prev);
      }
    } catch (err) {
      console.error("Failed to save availability:", err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !profile) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#F8FAFC]">
        <LiquidLoader text="Loading Availability" />
      </div>
    );
  }

  const dashboardDoctor = {
    id: activeDoctor.id,
    name: activeDoctor.name,
    initials: activeDoctor.initials,
    specialization: activeDoctor.specialization
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] font-sans text-deadly-depths overflow-hidden">
      <DoctorSidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC]">
        <DoctorNavbar doctor={dashboardDoctor as any} />

        <main className="flex-1 overflow-y-auto px-8 md:px-10 pt-10 pb-10 relative bg-[#F8FAFC]">
          <div className="w-full pb-10">
            <AvailabilityCard 
              availability={profile.availability} 
              onSave={handleSaveAvailability}
              isSaving={isSaving}
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DoctorAvailability;
