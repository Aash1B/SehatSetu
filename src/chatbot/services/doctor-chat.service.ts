import { Injectable, Logger } from '@nestjs/common';
import { DoctorsService } from '../../doctors/doctors.service';
import { ChatIntent } from '../types/chatbot.types';

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

export interface DoctorSearchResult {
  specialty: string;
  message: string;
  cards: DoctorChatCard[];
  suggestedReplies: string[];
}

const SYMPTOM_TO_SPECIALTY: Record<string, string> = {
  fever: 'General Physician',
  cough: 'General Physician',
  cold: 'General Physician',
  headache: 'General Physician',
  weakness: 'General Physician',
  fatigue: 'General Physician',
  'body ache': 'General Physician',
  'general checkup': 'General Physician',
  infection: 'General Physician',
  dizziness: 'General Physician',
  'mild headache': 'General Physician',
  'runny nose': 'General Physician',
  'chest pain': 'Cardiologist',
  'heart pain': 'Cardiologist',
  palpitations: 'Cardiologist',
  'irregular heartbeat': 'Cardiologist',
  hypertension: 'Cardiologist',
  'high blood pressure': 'Cardiologist',
  'heart disease': 'Cardiologist',
  'cardiac problem': 'Cardiologist',
  'skin rash': 'Dermatologist',
  rash: 'Dermatologist',
  itching: 'Dermatologist',
  acne: 'Dermatologist',
  eczema: 'Dermatologist',
  'skin infection': 'Dermatologist',
  'hair loss': 'Dermatologist',
  dandruff: 'Dermatologist',
  psoriasis: 'Dermatologist',
  'skin allergy': 'Dermatologist',
  'dark spots': 'Dermatologist',
  'nail problem': 'Dermatologist',
  migraine: 'Neurologist',
  seizure: 'Neurologist',
  numbness: 'Neurologist',
  'severe headache': 'Neurologist',
  'persistent headache': 'Neurologist',
  'nerve pain': 'Neurologist',
  'memory problem': 'Neurologist',
  'balance problem': 'Neurologist',
  paralysis: 'Neurologist',
  tremor: 'Neurologist',
  tingling: 'Neurologist',
  child: 'Pediatrician',
  infant: 'Pediatrician',
  baby: 'Pediatrician',
  toddler: 'Pediatrician',
  pediatric: 'Pediatrician',
  'child fever': 'Pediatrician',
  'child cough': 'Pediatrician',
  'child vaccination': 'Pediatrician',
  pregnancy: 'Gynecologist',
  gynecology: 'Gynecologist',
  'menstrual problem': 'Gynecologist',
  'irregular periods': 'Gynecologist',
  'period pain': 'Gynecologist',
  'pelvic pain': 'Gynecologist',
  pcos: 'Gynecologist',
  menopause: 'Gynecologist',
  fertility: 'Gynecologist',
  anxiety: 'Psychiatrist',
  depression: 'Psychiatrist',
  'panic attack': 'Psychiatrist',
  stress: 'Psychiatrist',
  'mental health': 'Psychiatrist',
  'mood swings': 'Psychiatrist',
  trauma: 'Psychiatrist',
  'sleep disorder': 'Psychiatrist',
  addiction: 'Psychiatrist',
  'joint pain': 'Orthopedist',
  'knee pain': 'Orthopedist',
  'back pain': 'Orthopedist',
  'bone pain': 'Orthopedist',
  fracture: 'Orthopedist',
  sprain: 'Orthopedist',
  'muscle injury': 'Orthopedist',
  'neck pain': 'Orthopedist',
  'sports injury': 'Orthopedist',
  'shoulder pain': 'Orthopedist',
  'eye pain': 'Ophthalmologist',
  'blurred vision': 'Ophthalmologist',
  'red eye': 'Ophthalmologist',
  'vision problem': 'Ophthalmologist',
  'eye infection': 'Ophthalmologist',
  'watery eyes': 'Ophthalmologist',
  'dry eyes': 'Ophthalmologist',
  'double vision': 'Ophthalmologist',
  'eye injury': 'Ophthalmologist',
  'ear pain': 'ENT Specialist',
  'hearing loss': 'ENT Specialist',
  'difficulty hearing': 'ENT Specialist',
  'blocked nose': 'ENT Specialist',
  sinus: 'ENT Specialist',
  'sore throat': 'ENT Specialist',
  'throat pain': 'ENT Specialist',
  tonsil: 'ENT Specialist',
  'nose bleeding': 'ENT Specialist',
  'ear infection': 'ENT Specialist',
  'voice problem': 'ENT Specialist',
  asthma: 'Pulmonologist',
  'breathing problem': 'Pulmonologist',
  'shortness of breath': 'Pulmonologist',
  wheezing: 'Pulmonologist',
  'lung problem': 'Pulmonologist',
  'persistent cough': 'Pulmonologist',
  'chest congestion': 'Pulmonologist',
  'sleep apnea': 'Pulmonologist',
  'stomach pain': 'Gastroenterologist',
  'abdominal pain': 'Gastroenterologist',
  acidity: 'Gastroenterologist',
  'acid reflux': 'Gastroenterologist',
  constipation: 'Gastroenterologist',
  diarrhea: 'Gastroenterologist',
  vomiting: 'Gastroenterologist',
  indigestion: 'Gastroenterologist',
  'liver problem': 'Gastroenterologist',
  'blood in stool': 'Gastroenterologist',
  bloating: 'Gastroenterologist',
  diabetes: 'Endocrinologist',
  'high blood sugar': 'Endocrinologist',
  'low blood sugar': 'Endocrinologist',
  thyroid: 'Endocrinologist',
  'hormonal problem': 'Endocrinologist',
  'hormone imbalance': 'Endocrinologist',
  'unexplained weight gain': 'Endocrinologist',
  'unexplained weight loss': 'Endocrinologist',
  'insulin problem': 'Endocrinologist',
  'painful urination': 'Urologist',
  'urinary pain': 'Urologist',
  'frequent urination': 'Urologist',
  'blood in urine': 'Urologist',
  'kidney stone': 'Urologist',
  'urine problem': 'Urologist',
  'prostate problem': 'Urologist',
  'bladder problem': 'Urologist',
  'male reproductive': 'Urologist',
  'tooth pain': 'Dentist',
  toothache: 'Dentist',
  'gum pain': 'Dentist',
  'bleeding gums': 'Dentist',
  cavity: 'Dentist',
  'broken tooth': 'Dentist',
  'dental problem': 'Dentist',
  'bad breath': 'Dentist',
  'tooth sensitivity': 'Dentist',
};

const SPECIALTY_ALIASES: Record<string, string> = {
  'general physician': 'General Physician',
  physician: 'General Physician',
  'general doctor': 'General Physician',
  'primary care': 'General Physician',
  cardiologist: 'Cardiologist',
  'heart specialist': 'Cardiologist',
  dermatologist: 'Dermatologist',
  'skin specialist': 'Dermatologist',
  neurologist: 'Neurologist',
  'brain specialist': 'Neurologist',
  pediatrician: 'Pediatrician',
  'child specialist': 'Pediatrician',
  gynecologist: 'Gynecologist',
  obstetrician: 'Gynecologist',
  'women doctor': 'Gynecologist',
  psychiatrist: 'Psychiatrist',
  'mental health': 'Psychiatrist',
  psychologist: 'Psychiatrist',
  orthopedist: 'Orthopedist',
  'orthopedic doctor': 'Orthopedist',
  'bone specialist': 'Orthopedist',
  ophthalmologist: 'Ophthalmologist',
  'eye specialist': 'Ophthalmologist',
  'ent specialist': 'ENT Specialist',
  'ear nose throat': 'ENT Specialist',
  pulmonologist: 'Pulmonologist',
  'lung specialist': 'Pulmonologist',
  gastroenterologist: 'Gastroenterologist',
  'stomach specialist': 'Gastroenterologist',
  endocrinologist: 'Endocrinologist',
  'diabetes specialist': 'Endocrinologist',
  urologist: 'Urologist',
  'kidney specialist': 'Urologist',
  dentist: 'Dentist',
  'dental doctor': 'Dentist',
};

@Injectable()
export class DoctorChatService {
  private readonly logger = new Logger(DoctorChatService.name);

  constructor(private readonly doctorsService: DoctorsService) {}

  async searchDoctors(query: string, intent: ChatIntent, fallbackSpecialty?: string): Promise<DoctorSearchResult> {
    const normalizedQuery = (query || '').toLowerCase().trim();

    if (!normalizedQuery && !fallbackSpecialty) {
      return {
        specialty: '',
        message: 'Please tell me which specialty or symptom you are looking for.',
        cards: [],
        suggestedReplies: ['General Physician', 'Cardiologist', 'Dermatologist'],
      };
    }

    const specialty = this.resolveSpecialty(normalizedQuery, intent) || fallbackSpecialty || '';
    const allDoctors = await this.doctorsService.findAll();

    const filtered = allDoctors.filter((doctor: any) => {
      const doctorSpecialty = (doctor.specialty || '').toLowerCase();
      const matchesSpecialty =
        !specialty || doctorSpecialty.includes(specialty.toLowerCase());
      const isActive = doctor.isActive !== false;
      const isVerified = doctor.isVerified !== false;
      return matchesSpecialty && isActive && isVerified;
    });

    const ranked = this.rankDoctors(filtered);

    const topDoctors = ranked.slice(0, 5);
    const cards = topDoctors.map((doctor: any) => this.mapToCard(doctor, specialty));

    if (cards.length === 0) {
      return {
        specialty,
        message: specialty
          ? `No ${specialty} doctors are currently available in the directory.`
          : 'No matching doctors are currently available in the directory.',
        cards: [],
        suggestedReplies: [
          'Try another specialty',
          'Search all doctors',
          'Nearby hospitals',
        ],
      };
    }

    const doctorCount = cards.length;
    const message =
      intent === ChatIntent.DOCTOR_RECOMMENDATION
        ? `Based on your concern, ${specialty || 'a general physician'} may be suitable. Here are ${doctorCount} available doctor${doctorCount > 1 ? 's' : ''} from our directory. This is not a medical diagnosis.`
        : `Here are ${doctorCount} ${specialty || 'doctor'}${doctorCount > 1 ? 's' : ''} from our directory.`;

    return {
      specialty,
      message,
      cards,
      suggestedReplies: ['Check availability', 'Book appointment', 'Nearby hospitals'],
    };
  }

  private resolveSpecialty(query: string, intent: ChatIntent): string {
    if (intent === ChatIntent.DOCTOR_SEARCH) {
      const alias = SPECIALTY_ALIASES[query];
      if (alias) return alias;
      for (const [key, value] of Object.entries(SPECIALTY_ALIASES)) {
        if (query.includes(key)) return value;
      }
      for (const [key, value] of Object.entries(SPECIALTY_ALIASES)) {
        if (value.toLowerCase().includes(query)) return value;
      }
    }

    if (intent === ChatIntent.DOCTOR_RECOMMENDATION) {
      for (const [symptom, specialty] of Object.entries(SYMPTOM_TO_SPECIALTY)) {
        if (query.includes(symptom)) {
          return specialty;
        }
      }
    }

    return '';
  }

  private rankDoctors(doctors: any[]): any[] {
    return [...doctors].sort((a, b) => {
      if (b.isVerified && !a.isVerified) return 1;
      if (a.isVerified && !b.isVerified) return -1;

      if (b.isActive && a.isActive === false) return 1;
      if (a.isActive && b.isActive === false) return -1;

      if (b.profileCompleted && !a.profileCompleted) return 1;
      if (a.profileCompleted && !b.profileCompleted) return -1;

      const expA = this.parseExperience(a.experience);
      const expB = this.parseExperience(b.experience);
      if (expB !== expA) return expB - expA;

      const ratingA = typeof a.rating === 'number' ? a.rating : 0;
      const ratingB = typeof b.rating === 'number' ? b.rating : 0;
      if (ratingB !== ratingA) return ratingB - ratingA;

      return (b.priorityScore ?? 0) - (a.priorityScore ?? 0);
    });
  }

  private parseExperience(experience?: string): number {
    if (!experience) return 0;
    const match = experience.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  private mapToCard(doctor: any, specialty: string): DoctorChatCard {
    const name = doctor.name || doctor.user?.fullName || 'Doctor';
    const card: DoctorChatCard = {
      type: 'doctor',
      doctorId: doctor.id,
      name: name.startsWith('Dr.') ? name : `Dr. ${name}`,
      specialty: doctor.specialty || specialty,
      reason: `Matches your search for ${doctor.specialty || specialty}.`,
      actions: [
        { label: 'View profile', value: `view_profile:${doctor.id}` },
        { label: 'Check availability', value: `check_availability:${doctor.id}` },
      ],
    };

    if (doctor.imageUrl) card.profileImage = doctor.imageUrl;
    if (doctor.experience) card.experience = doctor.experience;
    if (Array.isArray(doctor.tags) && doctor.tags.length > 0) {
      card.languages = doctor.tags;
    }
    if (typeof doctor.rating === 'number') card.rating = doctor.rating;
    if (doctor.fee) card.consultationFee = doctor.fee;
    else if (doctor.consultationFee) card.consultationFee = `₹${doctor.consultationFee}`;
    if (doctor.availability?.status) {
      card.consultationMode = doctor.availability.status;
    }

    return card;
  }
}
