// Enums
export enum ConsultationStatus {
  WAITING = 'WAITING',
  CHECKED_IN = 'CHECKED_IN',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  REFERRED = 'REFERRED'
}

export enum ReferralStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  COMPLETED = 'COMPLETED'
}

export enum Priority {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  EMERGENCY = 'EMERGENCY'
}

export enum Specialization {
  GENERAL_PHYSICIAN = 'General Physician',
  PEDIATRICIAN = 'Pediatrician',
  GYNECOLOGIST = 'Gynecologist',
  DERMATOLOGIST = 'Dermatologist',
  ORTHOPEDIC = 'Orthopedic',
  CARDIOLOGIST = 'Cardiologist',
  PSYCHIATRIST = 'Psychiatrist',
  ENT = 'ENT Specialist'
}

// Sub-Entities
export interface Doctor {
  id: string;
  name: string;
  initials: string;
  specialization: Specialization;
}

export interface DashboardStats {
  todayAppointments: number;
  completedAppointments: number;
  aiInsightsReady: boolean;
}

export interface PatientProfile {
  id: string;
  name: string;
  initials: string;
  age: number;
  gender: 'M' | 'F' | 'Other';
  bloodGroup?: string;
  weight?: string;
  height?: string;
  avatarColorClass?: string;
}

export interface TagDTO {
  label: string;
  variant: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export interface ActivityDTO {
  id: string;
  message: string;
  timeAgo: string;
  iconName: string; // Will map to a lucide-react icon component on the frontend
  colorScheme: 'blue' | 'purple' | 'red' | 'green' | 'orange' | 'gray';
}

export interface MedicalHistoryDTO {
  id: string;
  date: string;
  description: string;
}

export interface MedicationDTO {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
}

export interface AISummaryDTO {
  summaryText: string;
  confidenceScore: number; // 0-100
}

// Main Contracts
export interface ConsultationSummary {
  id: string;
  patient: PatientProfile;
  time: string;
  chiefComplaint: string;
  status: ConsultationStatus;
  priority: Priority;
  tags: TagDTO[];
}

export interface DashboardResponse {
  doctor: Doctor;
  stats: DashboardStats;
  todayConsultations: ConsultationSummary[];
  recentActivities: ActivityDTO[];
}

export interface ConsultationDetails {
  consultationId: string;
  patient: PatientProfile;
  appointmentTime: string;
  chiefComplaints: string[];
  durationSinceStart: string; 
  medicalHistory: MedicalHistoryDTO[];
  pastConditions: string[];
  currentMedicines: MedicationDTO[];
  allergies: string[];
  aiSummary: AISummaryDTO;
  status: ConsultationStatus;
}

export interface ReferralDTO {
  consultationId: string;
  patientId: string;
  fromDoctorId: string;
  targetSpecialization: Specialization;
  reason: string;
  additionalNotes?: string;
  priority: Priority;
  status: ReferralStatus;
  createdAt: string;
}

export interface TranscriptDTO {
  id: string;
  speaker: 'Doctor' | 'Patient' | 'AI';
  text: string;
  timestamp: string;
}

export interface AIInsightDTO {
  id: string;
  type: 'SUGGESTION' | 'WARNING' | 'INFO';
  message: string;
  confidence: number;
}

