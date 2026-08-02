import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma';
import { AiService } from '../ai/ai.service';

const SYMPTOM_TO_SPECIALTY_MAP: Record<string, string> = {
  skin: 'Dermatologist',
  rash: 'Dermatologist',
  itching: 'Dermatologist',
  acne: 'Dermatologist',
  eczema: 'Dermatologist',
  dermatology: 'Dermatologist',
  heart: 'Cardiologist',
  chest: 'Cardiologist',
  palpitations: 'Cardiologist',
  child: 'Pediatrician',
  baby: 'Pediatrician',
  toddler: 'Pediatrician',
  pediatric: 'Pediatrician',
  bone: 'Orthopedic Doctor',
  joint: 'Orthopedic Doctor',
  knee: 'Orthopedic Doctor',
  fracture: 'Orthopedic Doctor',
  spine: 'Orthopedic Doctor',
  migraine: 'Neurologist',
  seizure: 'Neurologist',
  numbness: 'Neurologist',
  period: 'Gynecologist',
  pregnancy: 'Gynecologist',
  pcos: 'Gynecologist',
  tooth: 'Dentist',
  teeth: 'Dentist',
  gum: 'Dentist',
  eye: 'Ophthalmologist',
  vision: 'Ophthalmologist',
  ear: 'ENT Specialist',
  nose: 'ENT Specialist',
  throat: 'ENT Specialist',
  sinus: 'ENT Specialist',
  anxiety: 'Psychiatrist',
  depression: 'Psychiatrist',
  stress: 'Psychiatrist',
  asthma: 'Pulmonologist',
  breathing: 'Pulmonologist',
  lung: 'Pulmonologist',
  stomach: 'Gastroenterologist',
  acidity: 'Gastroenterologist',
  digestion: 'Gastroenterologist',
  diabetes: 'Endocrinologist',
  thyroid: 'Endocrinologist',
  urine: 'Urologist',
  kidney: 'Urologist',
};

@Injectable()
export class DoctorsService {
  constructor(
    private readonly aiService: AiService,
  ) {}

  async findAll() {
    const doctors = await prisma.doctor.findMany();
    return doctors;
  }

  async findOne(id: string) {
    const doctor = await prisma.doctor.findUnique({
      where: { id },
    });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }
    return doctor;
  }

  async recommendDoctors(issue: string, symptoms: string[] = []) {
    let recommendedCategory = 'General Physician';
    let matchedSymptoms: string[] = [];
    let reason = 'General medical consultation recommended';
    let urgency = 'Routine';

    // 1. Attempt AI service call
    try {
      const response: any = await this.aiService.post('recommend-doctor', {
        issue: issue || 'General consultation',
        symptoms,
        age: 28,
        language: 'en',
        output_language: 'en',
      });

      if (response?.data?.recommended_doctor_category) {
        recommendedCategory = response.data.recommended_doctor_category;
        matchedSymptoms = response.data.matched_symptoms || symptoms;
        reason = response.data.reason || `Recommended ${recommendedCategory} based on symptoms.`;
        urgency = response.data.urgency || 'Routine';
      }
    } catch (err) {
      // 2. Rule-based fallback mapping if AI microservice is offline
      const combinedText = `${issue} ${symptoms.join(' ')}`.toLowerCase();
      for (const [kw, specialty] of Object.entries(SYMPTOM_TO_SPECIALTY_MAP)) {
        if (combinedText.includes(kw)) {
          recommendedCategory = specialty;
          matchedSymptoms.push(kw);
          reason = `Matched symptom "${kw}" to ${specialty}`;
          break;
        }
      }
    }

    // Extract core keyword for matching database specialty (e.g., 'Dermatologist')
    const searchKeyword = recommendedCategory.split(' ')[0];

    let doctors = await prisma.doctor.findMany({
      where: {
        specialty: {
          contains: searchKeyword,
          mode: 'insensitive',
        },
      },
    });

    // Fallback if no specific doctors match
    if (doctors.length === 0) {
      doctors = await prisma.doctor.findMany({
        take: 5,
      });
    }

    return {
      recommendedCategory,
      matchedSymptoms,
      reason,
      urgency,
      recommendedDoctors: doctors,
    };
  }
}
