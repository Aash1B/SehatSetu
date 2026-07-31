import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAppointment(data: any) {
    const { doctorId, patientEmail, patientPhone, ...restData } = data;

    // 1. Verify or resolve doctorId in Supabase Doctor table
    let validDoctorId = doctorId;
    if (doctorId) {
      const existingDoctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
      });
      if (!existingDoctor) {
        // Fallback to first available doctor in database if ID doesn't match
        const fallbackDoctor = await this.prisma.doctor.findFirst();
        if (fallbackDoctor) {
          validDoctorId = fallbackDoctor.id;
        }
      }
    } else {
      const fallbackDoctor = await this.prisma.doctor.findFirst();
      if (fallbackDoctor) {
        validDoctorId = fallbackDoctor.id;
      }
    }

    // 2. Resolve patientId if patient user exists in database by email
    let patientId: string | undefined = undefined;
    if (patientEmail) {
      const user = await this.prisma.user.findUnique({
        where: { email: patientEmail },
        include: { patient: true },
      });
      if (user?.patient) {
        patientId = user.patient.id;
      }
    }

    // 3. Create appointment record in Supabase
    return this.prisma.appointment.create({
      data: {
        ...restData,
        patientEmail,
        patientPhone,
        doctorId: validDoctorId,
        ...(patientId ? { patientId } : {}),
      },
    });
  }

  async getAllAppointments() {
    return this.prisma.appointment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { doctor: true, patient: true },
    });
  }

  async getAppointmentsForDoctor(doctorId: string) {
    return this.prisma.appointment.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      include: { patient: true },
    });
  }
}
