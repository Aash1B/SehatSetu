export enum ChatIntent {
  EMERGENCY = 'EMERGENCY',
  GREETING = 'GREETING',
  DOCTOR_SEARCH = 'DOCTOR_SEARCH',
  DOCTOR_RECOMMENDATION = 'DOCTOR_RECOMMENDATION',
  DOCTOR_AVAILABILITY = 'DOCTOR_AVAILABILITY',
  APPOINTMENT_BOOKING = 'APPOINTMENT_BOOKING',
  APPOINTMENT_STATUS = 'APPOINTMENT_STATUS',
  NEARBY_HOSPITALS = 'NEARBY_HOSPITALS',
  NEARBY_LABS = 'NEARBY_LABS',
  LAB_TEST_GUIDANCE = 'LAB_TEST_GUIDANCE',
  HEALTH_RECORDS = 'HEALTH_RECORDS',
  PRESCRIPTIONS = 'PRESCRIPTIONS',
  HELP = 'HELP',
  GENERAL_CHAT = 'GENERAL_CHAT',
  UNKNOWN = 'UNKNOWN',
}

export interface SlotInfo {
  startTime: string;
  endTime: string;
  displayTime: string;
  mode: string;
}

export interface CardAction {
  type: string;
  label: string;
  value?: string;
}

export interface ChatCard {
  type: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  doctorId?: string;
  doctorName?: string;
  specialty?: string;
  date?: string;
  time?: string;
  slots?: SlotInfo[];
  actions?: CardAction[];
  appointmentId?: string;
  status?: string;
  consultationMode?: string;
  mode?: string;
  fee?: string;
  actionType?: 'BOOK_APPOINTMENT' | 'CANCEL_APPOINTMENT' | 'RESCHEDULE_APPOINTMENT';
  message?: string;
  hospitalId?: string;
  labId?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
  phone?: string;
  openStatus?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
}

export interface DoctorChatCard {
  type: 'doctor';
  doctorId: string;
  name: string;
  specialty: string;
  profileImage?: string;
  experience?: string;
  languages?: string[];
  rating?: number;
  consultationFee?: string;
  consultationMode?: string;
  reason: string;
  actions: { label: string; value: string }[];
}

export interface HospitalChatCard {
  type: 'hospital';
  hospitalId: string;
  name: string;
  address?: string;
  distance?: number;
  latitude?: number;
  longitude?: number;
  phone?: string;
  openStatus?: 'OPEN' | 'CLOSED' | 'UNKNOWN';
  hospitalType?: string;
  emergencyCapability?: boolean;
  directionsUrl?: string;
  actions: { label: string; value: string }[];
}

export interface LabChatCard {
  type: 'lab';
  labId: string;
  name: string;
  address?: string;
  distance?: number;
  phone?: string;
  openingHours?: string;
  homeCollection?: boolean;
  availableTests?: string[];
  directionsUrl?: string;
  actions: { label: string; value: string }[];
}

export interface EmergencyCard {
  type: 'emergency';
  message: string;
  callNumber: string;
  callAction: string;
  locationRequired: boolean;
  findHospitals?: boolean;
  actions: { label: string; value: string }[];
}

export interface LocationRequiredCard {
  type: 'location-required';
  title: string;
  subtitle: string;
  message: string;
  actions: { label: string; value: string }[];
}

export interface ProviderUnavailableCard {
  type: 'provider-unavailable';
  title: string;
  subtitle: string;
  message: string;
  actions: { label: string; value: string }[];
}

export interface DoctorSearchResult {
  specialty: string;
  message: string;
  cards: DoctorChatCard[];
  suggestedReplies: string[];
}

export interface ChatbotResponse {
  conversationId: string;
  intent: ChatIntent;
  message: string;
  cards?: ChatCard[];
  suggestedReplies?: string[];
}

export type PendingAction =
  | ({ type: 'BOOK_APPOINTMENT' } & BookAppointmentPayload)
  | ({ type: 'CANCEL_APPOINTMENT' } & CancelAppointmentPayload)
  | ({ type: 'RESCHEDULE_APPOINTMENT' } & RescheduleAppointmentPayload);

export interface BookAppointmentPayload {
  doctorId?: string;
  slot?: { startTime: string; endTime: string; displayTime: string; mode: string };
  date?: string;
  expiresAt: Date;
}

export interface CancelAppointmentPayload {
  appointmentId?: string;
  expiresAt: Date;
}

export interface RescheduleAppointmentPayload {
  appointmentId?: string;
  doctorId?: string;
  slot?: { startTime: string; endTime: string; displayTime: string; mode: string };
  date?: string;
  expiresAt: Date;
}
