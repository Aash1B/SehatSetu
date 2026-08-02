import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '../prisma';

export interface UpdatePatientProfileDto {
  fullName?: string;
  phone?: string;
  gender?: string;
  age?: string;
  height?: string;
  weight?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  allergies?: string[];
  chronicConditions?: string[];
}

@Injectable()
export class PatientService {
  constructor() {}

  async getProfile(userId: string) {
    let user;
    if (!userId || userId === 'default') {
      user = await prisma.user.findFirst({
        where: { role: 'PATIENT' },
        include: { patient: true },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { patient: true },
      });
    }

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    let patient = user.patient;
    if (!patient) {
      patient = await prisma.patient.create({
        data: { userId: user.id },
      });
    }

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ...patient,
    };
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    let user;
    if (!userId || userId === 'default') {
      user = await prisma.user.findFirst({
        where: { role: 'PATIENT' },
        include: { patient: true },
      });
    } else {
      user = await prisma.user.findUnique({
        where: { id: userId },
        include: { patient: true },
      });
    }

    if (!user) {
      throw new NotFoundException('User profile not found');
    }

    if (dto.fullName) {
      await prisma.user.update({
        where: { id: user.id },
        data: { fullName: dto.fullName },
      });
    }

    let patient = user.patient;
    if (!patient) {
      patient = await prisma.patient.create({
        data: { userId: user.id },
      });
    }

    const updatedPatient = await prisma.patient.update({
      where: { id: patient.id },
      data: {
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.gender !== undefined && { gender: dto.gender }),
        ...(dto.age !== undefined && { age: dto.age }),
        ...(dto.height !== undefined && { height: dto.height }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
        ...(dto.emergencyContact !== undefined && { emergencyContact: dto.emergencyContact }),
        ...(dto.allergies !== undefined && { allergies: dto.allergies }),
        ...(dto.chronicConditions !== undefined && { chronicConditions: dto.chronicConditions }),
      },
    });

    const { userId: patientUserId, ...patientFields } = updatedPatient;
    return {
      userId: user.id,
      email: user.email,
      fullName: dto.fullName || user.fullName,
      role: user.role,
      ...patientFields,
    };
  }

  async getDashboardData(userId: string) {
    const profile = await this.getProfile(userId);

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: profile.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: true,
      },
    });

    return {
      profile,
      appointments,
    };
  }
}
