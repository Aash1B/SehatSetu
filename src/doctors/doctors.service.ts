import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    const doctors = await prisma.doctor.findMany({
      where: {
        userId: { not: null },
        imageUrl: { not: null },
      },
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    });
    return doctors.map((doctor) => ({
      ...doctor,
      name: doctor.name || doctor.user?.fullName || 'Doctor',
    }));
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

  async findForUser(userId: string, role: string) {
    if (role !== 'DOCTOR') throw new ForbiddenException('Doctor account required');
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { doctor: true } });
    if (!user?.doctor) throw new NotFoundException('Doctor profile not found');

    // Older bookings used catalog doctor IDs. Reattach the matching catalog
    // profile to the authenticated doctor so ownership and prescriptions agree.
    const normalizedUserName = user.fullName.replace(/^dr\.?\s*/i, '').trim().toLowerCase();
    const catalogDoctors = await prisma.doctor.findMany({ where: { userId: null } });
    const catalogMatch = catalogDoctors.find((doctor) =>
      doctor.name?.replace(/^dr\.?\s*/i, '').trim().toLowerCase() === normalizedUserName,
    );
    let doctor = user.doctor;
    if (catalogMatch && catalogMatch.id !== doctor.id) {
      doctor = await prisma.$transaction(async (tx) => {
        await tx.appointment.updateMany({ where: { doctorId: catalogMatch.id }, data: { doctorId: doctor.id } });
        await tx.prescription.updateMany({ where: { doctorId: catalogMatch.id }, data: { doctorId: doctor.id } });
        return tx.doctor.update({
          where: { id: doctor.id },
          data: {
            name: catalogMatch.name || user.fullName,
            specialty: catalogMatch.specialty || doctor.specialty,
            experience: catalogMatch.experience || doctor.experience,
            degrees: catalogMatch.degrees || doctor.degrees,
            hospital: catalogMatch.hospital || doctor.hospital,
            location: catalogMatch.location || doctor.location,
            imageUrl: catalogMatch.imageUrl || doctor.imageUrl,
            consultationFee: catalogMatch.consultationFee || doctor.consultationFee,
          },
        });
      });
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctor.id },
      select: { patientId: true, status: true, scheduledAt: true },
    });
    const consultations = appointments.filter((appointment) => appointment.status !== 'CANCELLED');
    const completed = consultations.filter((appointment) => appointment.status === 'COMPLETED');
    const todaysAppointments = consultations.filter((appointment) =>
      appointment.scheduledAt &&
      appointment.scheduledAt >= startOfToday &&
      appointment.scheduledAt < startOfTomorrow,
    ).length;

    return {
      ...doctor,
      name: user.fullName || doctor.name || 'Doctor',
      user: { id: user.id, fullName: user.fullName, email: user.email },
      stats: {
        totalConsultations: consultations.length,
        completedConsultations: completed.length,
        patientsTreated: new Set(completed.map((appointment) => appointment.patientId).filter(Boolean)).size,
        todaysAppointments,
      },
    };
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
    const specialtyFilter = { startsWith: searchKeyword, mode: 'insensitive' as const };

    let doctors = await prisma.doctor.findMany({
      where: {
        specialty: specialtyFilter,
        profileCompleted: true,
        isActive: true,
        isVerified: true,
        imageUrl: { not: null },
      },
      include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
    });

    // If the requested specialist is unavailable, route to primary care rather
    // than returning an unrelated doctor.
    if (doctors.length === 0) {
      doctors = await prisma.doctor.findMany({
        where: {
          specialty: {
            contains: 'General Physician',
            mode: 'insensitive',
          },
          profileCompleted: true,
          isActive: true,
          isVerified: true,
          imageUrl: { not: null },
        },
        take: 5,
        include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
      });
    }

    return {
      recommendedCategory,
      matchedSymptoms,
      reason,
      urgency,
      recommendedDoctors: doctors.map((doctor) => ({
        ...doctor,
        name: doctor.name || doctor.user?.fullName || 'Doctor',
      })),
    };
  }
}
