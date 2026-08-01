import { Injectable } from '@nestjs/common';
import { prisma } from '../prisma';

@Injectable()
export class AppointmentsService {
  async createAppointment(data: any) {
    return prisma.appointment.create({
      data,
    });
  }

  async getAppointmentsForDoctor(doctorId: string) {
    return prisma.appointment.findMany({
      where: { doctorId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
