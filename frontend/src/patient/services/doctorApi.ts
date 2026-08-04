import type { Doctor } from '../data/doctorsData';

const API_BASE = '/api/doctors';

export interface RecommendationResult {
  recommendedCategory: string;
  matchedSymptoms: string[];
  reason: string;
  urgency: string;
  recommendedDoctors: Doctor[];
}

function mapDoctorRow(doctor: any): Doctor {
  const rawName = doctor.user?.fullName || doctor.fullName || doctor.name || 'Doctor';
  const name = rawName.startsWith('Dr.') ? rawName : `Dr. ${rawName}`;
  return {
    id: doctor.id,
    name,
    specialty: doctor.specialty || 'General Physician',
    experience: doctor.experience || 'Not provided',
    rating: doctor.reviewsCount > 0 && doctor.rating ? doctor.rating : 0,
    reviewsCount: doctor.reviewsCount || 0,
    hospital: doctor.hospital || 'Not provided',
    location: doctor.location || 'Not provided',
    imageUrl: doctor.imageUrl || '',
    fee: doctor.fee || (doctor.consultationFee ? `₹${doctor.consultationFee}` : 'Not provided'),
    availableToday: Boolean(doctor.availableToday),
    priorityLevel: doctor.priorityLevel || '',
    priorityScore: doctor.priorityScore || 0,
    degrees: doctor.degrees || 'Not provided',
    tags: Array.isArray(doctor.tags) ? doctor.tags : [],
  };
}

export async function fetchDoctors(): Promise<Doctor[]> {
  const response = await fetch(API_BASE);
  if (!response.ok) throw new Error('Unable to load registered doctors');
  const doctors = await response.json();
  return Array.isArray(doctors) ? doctors.map(mapDoctorRow) : [];
}

export async function recommendDoctorsApi(issue: string, symptoms: string[]): Promise<RecommendationResult> {
  const response = await fetch(`${API_BASE}/recommend`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issue, symptoms }),
  });
  if (!response.ok) throw new Error('Unable to generate doctor recommendations');
  const result = await response.json();
  return {
    recommendedCategory: result.recommendedCategory || 'General Physician',
    matchedSymptoms: result.matchedSymptoms || [],
    reason: result.reason || '',
    urgency: result.urgency || 'Routine',
    recommendedDoctors: Array.isArray(result.recommendedDoctors)
      ? result.recommendedDoctors.map(mapDoctorRow)
      : [],
  };
}
