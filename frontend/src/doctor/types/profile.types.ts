export interface ProfessionalStats {
  totalConsultations: number;
  patientsTreated: number;
  todaysAppointments: number;
  completedConsultations: number;
  averageRating?: number;
}

export interface AvailabilitySlot {
  day: string;
  isWorking: boolean;
  workingHours: string;
  breakTime: string;
}

export interface Availability {
  slots: AvailabilitySlot[];
  slotDurationMinutes: number;
  status: 'Available' | 'On Leave' | 'Busy';
}

export interface DocumentInfo {
  id: string;
  name: string;
  type: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  uploadDate: string;
  publicUrl?: string;
}

export interface DoctorProfileData {
  id: string;
  fullName: string;
  photoUrl: string;
  specialization: string;
  qualification: string;
  yearsOfExperience: number;
  medicalLicenseNumber: string;
  isVerified: boolean;
  languagesSpoken: string[];
  aboutMe: string;
  email: string;
  phoneNumber: string;
  clinicName: string;
  address: string;
  stats: ProfessionalStats;
  availability: Availability;
  documents: DocumentInfo[];
}
