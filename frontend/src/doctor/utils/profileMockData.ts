import { DoctorProfileData } from '../types/profile.types';

export const mockDoctorProfile: DoctorProfileData = {
  id: 'DOC-90210',
  fullName: 'Dr. Sarah Jenkins',
  photoUrl: 'https://i.pravatar.cc/150?img=47',
  specialization: 'Cardiologist',
  qualification: 'MBBS, MD (Cardiology)',
  yearsOfExperience: 12,
  medicalLicenseNumber: 'MED-1928-8374',
  isVerified: true,
  languagesSpoken: ['English', 'Hindi', 'Marathi'],
  aboutMe: 'Dedicated and compassionate Cardiologist with 12 years of experience in diagnosing and treating cardiovascular diseases. Committed to providing holistic and patient-centered care. Actively involved in clinical research and continuous medical education.',
  email: 'dr.sarah.jenkins@sehatsetu.com',
  phoneNumber: '+91 98765 43210',
  clinicName: 'HeartCare Clinic',
  address: '123 Health Ave, Wellness District, Mumbai, MH 400001',
  stats: {
    totalConsultations: 4520,
    patientsTreated: 3100,
    todaysAppointments: 8,
    averageRating: 4.8,
    completedConsultations: 4512
  },
  availability: {
    slotDurationMinutes: 15,
    status: 'Available',
    slots: [
      { day: 'Monday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Tuesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Wednesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Thursday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
      { day: 'Friday', isWorking: true, workingHours: '09:00 AM - 01:00 PM', breakTime: 'None' },
      { day: 'Saturday', isWorking: false, workingHours: 'Closed', breakTime: '-' },
      { day: 'Sunday', isWorking: false, workingHours: 'Closed', breakTime: '-' }
    ]
  },
  documents: [
    { id: 'DOC-1', name: 'Medical License', type: 'PDF', status: 'Verified', uploadDate: '2023-01-15' },
    { id: 'DOC-2', name: 'MD Degree Certificate', type: 'Image', status: 'Verified', uploadDate: '2023-01-15' },
    { id: 'DOC-3', name: 'Identity Proof', type: 'PDF', status: 'Pending', uploadDate: '2023-11-20' }
  ]
};
