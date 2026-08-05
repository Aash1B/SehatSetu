import type { DoctorProfileData } from '../types/profile.types';
import { getUser } from '../../auth/authStorage';

export interface DoctorProfile {
  id: string;
  name: string;
  specialization: string;
  initials: string;
}

const initialsFor = (name: string) => name
  .replace(/^Dr\.?\s*/i, '')
  .split(/\s+/)
  .filter(Boolean)
  .map((part) => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase() || 'DR';

const emptyAvailability: DoctorProfileData['availability'] = {
  slotDurationMinutes: 30,
  status: 'Available',
  slots: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => ({
    day,
    isWorking: false,
    workingHours: 'Closed',
    breakTime: 'None',
  })),
};

function readStoredProfile(userId?: string): DoctorProfileData | null {
  if (!userId) return null;
  const raw = localStorage.getItem(`sehat_doctor_profile_${userId}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DoctorProfileData;
  } catch {
    return null;
  }
}

export function getActiveDoctor(): DoctorProfile {
  const user = getUser();
  const stored = readStoredProfile(user?.id);
  const rawName = stored?.fullName || user?.fullName || 'Doctor';
  const name = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
  return {
    id: stored?.id || user?.id || '',
    name,
    specialization: stored?.specialization || 'General Physician',
    initials: initialsFor(name),
  };
}

export function setActiveDoctorId(id: string) {
  localStorage.setItem('sehat_active_doctor_id', id);
  window.dispatchEvent(new Event('sehat_doctor_changed'));
}

export function getDoctorProfileData(docId?: string): DoctorProfileData {
  const user = getUser();
  const targetId = docId || user?.id || '';
  const stored = readStoredProfile(targetId);
  if (stored) return stored;
  const rawName = user?.fullName || 'Doctor';
  return {
    id: targetId,
    fullName: rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`,
    photoUrl: '',
    specialization: 'General Physician',
    qualification: '',
    yearsOfExperience: 0,
    medicalLicenseNumber: '',
    isVerified: false,
    languagesSpoken: [],
    aboutMe: '',
    email: user?.email || '',
    phoneNumber: '',
    clinicName: '',
    address: '',
    stats: {
      totalConsultations: 0,
      patientsTreated: 0,
      todaysAppointments: 0,
      completedConsultations: 0,
    },
    availability: emptyAvailability,
    documents: [],
  };
}
