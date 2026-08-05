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

/**
 * Returns the active doctor profile for the currently authenticated user.
 * Always prioritises the JWT auth user's name so stale localStorage data
 * from a previous session never bleeds into a new account.
 */
export function getActiveDoctor(): DoctorProfile {
  const user = getUser();

  // Always derive name from the authenticated user first — never from localStorage
  // that might belong to a different account
  if (user && user.role === 'DOCTOR') {
    const docId = user.id;
    const savedData = localStorage.getItem(`sehat_doctor_profile_${docId}`);

    if (savedData) {
      try {
        const parsed: DoctorProfileData = JSON.parse(savedData);
        // Only use fullName from saved data if it matches (or is a prefixed version of) the auth user's name
        const savedName = parsed.fullName || '';
        const authName = user.fullName || '';
        const savedClean = savedName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();
        const authClean = authName.replace(/^Dr\.\s*/i, '').trim().toLowerCase();

        // If the saved profile name matches the auth user, use the saved data (it has specialization etc.)
        if (savedClean === authClean || savedClean.includes(authClean) || authClean.includes(savedClean)) {
          const name = parsed.fullName.startsWith('Dr.') ? parsed.fullName : `Dr. ${parsed.fullName}`;
          const cleanName = name.replace(/^Dr\.\s*/i, '');
          const initials = cleanName.split(' ').map((n: string) => n[0]).filter(Boolean).join('').toUpperCase().slice(0, 2) || 'DR';
          return {
            id: docId,
            name,
            specialization: parsed.specialization || 'General Physician',
            initials,
          };
        }
      } catch (e) {
        console.warn('Failed to parse active doctor profile:', e);
      }
    }

    // Fall back to auth user's data (most reliable — comes from JWT)
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

  // No authenticated user — return first entry from list (demo/dev mode)
  return DOCTORS_LIST[0];
}

export function setActiveDoctorId(id: string) {
  localStorage.setItem('sehat_active_doctor_id', id);
  window.dispatchEvent(new Event('sehat_doctor_changed'));
}

/**
 * Returns full profile data for the given doctor ID.
 * For authenticated doctors, always uses their auth identity as the source of truth for name/email.
 */
export function getDoctorProfileData(docId?: string): DoctorProfileData {
  const user = getUser();
  const activeDoc = getActiveDoctor();
  const targetId = docId || activeDoc.id;

  const savedData = targetId
    ? localStorage.getItem(`sehat_doctor_profile_${targetId}`)
    : null;

  if (savedData) {
    try {
      const parsed: DoctorProfileData = JSON.parse(savedData);
      // Always use the authenticated user's name/email — never stale saved data
      const trueName = user?.fullName
        ? (user.fullName.startsWith('Dr.') ? user.fullName : `Dr. ${user.fullName}`)
        : (parsed.fullName.startsWith('Dr.') ? parsed.fullName : `Dr. ${parsed.fullName}`);
      return {
        ...parsed,
        fullName: trueName,
        email: user?.email || parsed.email,
      };
    } catch (e) {
      console.warn('Failed to parse doctor profile data:', e);
    }
  }

  // No saved profile — return minimal skeleton using the auth user's real data
  if (user && user.role === 'DOCTOR') {
    const name = user.fullName.startsWith('Dr.') ? user.fullName : `Dr. ${user.fullName}`;
    return {
      id: user.id,
      fullName: name,
      photoUrl: '',
      specialization: 'General Physician',
      qualification: '',
      yearsOfExperience: 0,
      medicalLicenseNumber: '',
      isVerified: false,
      languagesSpoken: ['English'],
      aboutMe: '',
      email: user.email,
      phoneNumber: '',
      clinicName: '',
      address: '',
      stats: {
        totalConsultations: 0,
        patientsTreated: 0,
        todaysAppointments: 0,
        averageRating: 0,
        completedConsultations: 0,
      },
      availability: mockDoctorProfile.availability,
      documents: mockDoctorProfile.documents,
    };
  }

  // Last-resort fallback: empty skeleton so the UI doesn't crash
  return {
    id: 'd-unknown',
    fullName: 'Dr. Partner',
    photoUrl: '',
    specialization: 'General Physician',
    qualification: '',
    yearsOfExperience: 0,
    medicalLicenseNumber: '',
    isVerified: false,
    languagesSpoken: ['English'],
    aboutMe: '',
    email: '',
    phoneNumber: '',
    clinicName: '',
    address: '',
    stats: {
      totalConsultations: 0,
      patientsTreated: 0,
      todaysAppointments: 0,
      averageRating: 0,
      completedConsultations: 0,
    },
    availability: mockDoctorProfile.availability,
    documents: mockDoctorProfile.documents,
  };
}
