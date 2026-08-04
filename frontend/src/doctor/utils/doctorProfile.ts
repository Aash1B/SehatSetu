import { doctorsData } from '../../patient/data/doctorsData';
import { mockDoctorProfile } from './profileMockData';
import type { DoctorProfileData } from '../types/profile.types';
import { getUser } from '../../auth/authStorage';

export interface DoctorProfile {
  id: string;
  name: string;
  specialization: string;
  initials: string;
}

export const DOCTORS_LIST: DoctorProfile[] = [
  { id: 'd1', name: 'Dr. Sarah Jenkins', specialization: 'Cardiologist', initials: 'SJ' },
  { id: 'doc-6', name: 'Dr. Sunita Deshmukh', specialization: 'General Physician', initials: 'SD' },
  { id: 'doc-11', name: 'Dr. Ananya Sharma', specialization: 'Dermatologist', initials: 'AS' },
  { id: 'doc-1', name: 'Dr. Alok Verma', specialization: 'Pediatrician', initials: 'AV' },
  { id: 'doc-2', name: 'Dr. Priya Mehta', specialization: 'Gynecologist', initials: 'PM' },
  { id: 'doc-3', name: 'Dr. Amit Verma', specialization: 'Neurologist', initials: 'AV' },
  { id: 'doc-5', name: 'Dr. Rajesh Gupta', specialization: 'Orthopedic Doctor', initials: 'RG' },
  { id: 'doc-4', name: 'Dr. Vikramaditya Roy', specialization: 'Cardiologist', initials: 'VR' },
];

export function getActiveDoctor(): DoctorProfile {
  const user = getUser();
  const docId = user?.id || localStorage.getItem('sehat_active_doctor_id');
  // Profiles are account-specific. The old unscoped key is only a fallback
  // when no authenticated doctor is available (for local/demo use).
  const savedData = docId
    ? localStorage.getItem(`sehat_doctor_profile_${docId}`)
    : localStorage.getItem('sehat_doctor_onboarding_data');

  if (savedData) {
    try {
      const parsed: DoctorProfileData = JSON.parse(savedData);
      const name = parsed.fullName ? (parsed.fullName.startsWith('Dr.') ? parsed.fullName : `Dr. ${parsed.fullName}`) : (user?.fullName ? `Dr. ${user.fullName}` : 'Dr. Partner');
      const spec = parsed.specialization || 'General Physician';
      const cleanName = name.replace(/^Dr\.\s*/i, '');
      const initials = cleanName.split(' ').map((n: string) => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || 'DR';

      return {
        id: parsed.id || docId || 'd-active',
        name,
        specialization: spec,
        initials,
      };
    } catch (e) {
      console.warn('Failed to parse active doctor profile:', e);
    }
  }

  if (user && user.role === 'DOCTOR') {
    const name = user.fullName.startsWith('Dr.') ? user.fullName : `Dr. ${user.fullName}`;
    const cleanName = name.replace(/^Dr\.\s*/i, '');
    const initials = cleanName.split(' ').map((n: string) => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || 'DR';
    return {
      id: user.id,
      name,
      specialization: 'General Physician',
      initials,
    };
  }

  const found = DOCTORS_LIST.find((d) => d.id === docId);
  return found || DOCTORS_LIST[0];
}

export function setActiveDoctorId(id: string) {
  localStorage.setItem('sehat_active_doctor_id', id);
  window.dispatchEvent(new Event('sehat_doctor_changed'));
}

export function getDoctorProfileData(docId?: string): DoctorProfileData {
  const user = getUser();
  const activeDoc = getActiveDoctor();
  const targetId = docId || activeDoc.id;
  const savedData = targetId
    ? localStorage.getItem(`sehat_doctor_profile_${targetId}`)
    : localStorage.getItem('sehat_doctor_onboarding_data');

  if (savedData) {
    try {
      const parsed: DoctorProfileData = JSON.parse(savedData);
      return {
        ...parsed,
        fullName: parsed.fullName.startsWith('Dr.') ? parsed.fullName : `Dr. ${parsed.fullName}`,
      };
    } catch (e) {
      console.warn('Failed to parse doctor profile data:', e);
    }
  }

  if (user && user.role === 'DOCTOR') {
    const name = user.fullName.startsWith('Dr.') ? user.fullName : `Dr. ${user.fullName}`;
    return {
      id: user.id,
      fullName: name,
      photoUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
      specialization: 'General Physician',
      qualification: 'MBBS, MD',
      yearsOfExperience: 8,
      medicalLicenseNumber: `MED-${user.id.slice(0, 6).toUpperCase()}`,
      isVerified: true,
      languagesSpoken: ['English', 'Hindi'],
      aboutMe: `Dedicated healthcare practitioner with expertise in diagnosis and patient care.`,
      email: user.email,
      phoneNumber: '+91 98765 43210',
      clinicName: 'SehatSetu Medical Network',
      address: '123 Health Ave, Wellness District, MH',
      stats: {
        totalConsultations: 120,
        patientsTreated: 95,
        todaysAppointments: 5,
        averageRating: 4.9,
        completedConsultations: 115
      },
      availability: mockDoctorProfile.availability,
      documents: mockDoctorProfile.documents
    };
  }

  const match = doctorsData.find(d => d.id === targetId) || doctorsData[0];
  const emailName = match.name.toLowerCase().replace(/dr\.\s*/i, '').replace(/\s+/g, '.');

  return {
    id: `DOC-${match.id.toUpperCase()}`,
    fullName: match.name,
    photoUrl: match.imageUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
    specialization: match.specialty,
    qualification: match.degrees || `MBBS, MD (${match.specialty})`,
    yearsOfExperience: parseInt(match.experience) || 10,
    medicalLicenseNumber: `MED-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
    isVerified: true,
    languagesSpoken: ['English', 'Hindi', 'Marathi'],
    aboutMe: `Dedicated and compassionate ${match.specialty} with ${match.experience} of experience in diagnosing and treating patients at ${match.hospital || 'SehatSetu Medical Network'}.`,
    email: `${emailName}@sehatsetu.com`,
    phoneNumber: '+91 98765 43210',
    clinicName: match.hospital || 'Apollo Medical Center',
    address: `123 Health Ave, Wellness District, ${match.location || 'Mumbai'}, MH 400001`,
    stats: {
      totalConsultations: 1200 + (match.reviewsCount || 100) * 2,
      patientsTreated: match.reviewsCount || 450,
      todaysAppointments: 5,
      averageRating: match.rating || 4.8,
      completedConsultations: 1190 + (match.reviewsCount || 100) * 2
    },
    availability: mockDoctorProfile.availability,
    documents: mockDoctorProfile.documents
  };
}
