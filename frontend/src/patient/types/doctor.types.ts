// Doctor type definitions (from patient's perspective)

export interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
  experience: number; // years
  rating: number;
  profileImage?: string;
  availableSlots?: TimeSlot[];
  consultationFee: number;
}

export interface TimeSlot {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}
