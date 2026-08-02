import { Injectable } from '@nestjs/common';
import {
  MedicalReportOcrStatus,
  MedicalReportStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../prisma';

@Injectable()
export class MedicalReportsRepository {
  findPatient(patientId: string) {
    return prisma.patient.findUnique({
      where: { id: patientId },
      select: { id: true, userId: true },
    });
  }

  findPatientByUserId(userId: string) {
    return prisma.patient.findUnique({
      where: { userId },
      select: { id: true, userId: true },
    });
  }

  createPatientForUser(userId: string) {
    return prisma.patient.create({
      data: {
        userId,
        allergies: [],
        chronicConditions: [],
      },
      select: { id: true, userId: true },
    });
  }

  findAppointment(appointmentId: string) {
    return prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        patientId: true,
        doctor: { select: { userId: true } },
      },
    });
  }

  doctorCanAccessPatient(userId: string, patientId: string) {
    return prisma.appointment.findFirst({
      where: {
        patientId,
        doctor: { is: { userId } },
      },
      select: { id: true },
    });
  }

  create(data: Prisma.MedicalReportUncheckedCreateInput) {
    return prisma.medicalReport.create({ data });
  }

  findById(id: string) {
    return prisma.medicalReport.findUnique({
      where: { id },
      include: {
        patient: { select: { userId: true } },
        appointment: {
          select: { doctor: { select: { userId: true } } },
        },
      },
    });
  }

  list(where: Prisma.MedicalReportWhereInput) {
    return prisma.medicalReport.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  update(id: string, data: Prisma.MedicalReportUpdateInput) {
    return prisma.medicalReport.update({ where: { id }, data });
  }

  updateMany(
    where: Prisma.MedicalReportWhereInput,
    data: Prisma.MedicalReportUpdateManyMutationInput,
  ) {
    return prisma.medicalReport.updateMany({ where, data });
  }

  claimForProcessing(id: string) {
    return this.updateMany(
      {
        id,
        status: {
          in: [
            MedicalReportStatus.UPLOADED,
            MedicalReportStatus.OCR_FAILED,
          ],
        },
        ocrStatus: { not: MedicalReportOcrStatus.PROCESSING },
      },
      {
        status: MedicalReportStatus.PROCESSING,
        ocrStatus: MedicalReportOcrStatus.PROCESSING,
        processingStartedAt: new Date(),
        processingErrorCode: null,
        processingErrorMessage: null,
      },
    );
  }
}
