import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CreateEhrRecordDto } from './dto/create-ehr-record.dto';

@Injectable()
export class EhrService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptRecord<T extends { diagnosis: string | null; notes: string | null; aiSummary: string | null }>(
    record: T,
  ): T {
    return {
      ...record,
      diagnosis: this.encryption.decrypt(record.diagnosis),
      notes: this.encryption.decrypt(record.notes),
      aiSummary: this.encryption.decrypt(record.aiSummary),
    };
  }

  async createRecord(dto: CreateEhrRecordDto, requestingUserId: string) {
    const doctor = await this.prisma.doctor.findUnique({ where: { userId: requestingUserId } });
    if (!doctor) {
      throw new ForbiddenException('Only doctors can create EHR records');
    }

    const hasAppointment = await this.prisma.appointment.findFirst({
      where: { doctorId: doctor.id, patientId: dto.patientId },
    });
    if (!hasAppointment) {
      throw new ForbiddenException('You do not have an appointment with this patient');
    }

    const record = await this.prisma.ehrRecord.create({
      data: {
        patientId: dto.patientId,
        appointmentId: dto.appointmentId,
        diagnosis: this.encryption.encrypt(dto.diagnosis),
        notes: this.encryption.encrypt(dto.notes),
      },
    });

    return this.decryptRecord(record);
  }

  async getPatientHistory(patientId: string, requestingUserId: string, requestingRole: string) {
    if (requestingRole === 'PATIENT') {
      const patient = await this.prisma.patient.findUnique({ where: { userId: requestingUserId } });
      if (!patient || patient.id !== patientId) {
        throw new ForbiddenException('You can only view your own EHR history');
      }
    } else if (requestingRole === 'DOCTOR') {
      const doctor = await this.prisma.doctor.findUnique({ where: { userId: requestingUserId } });
      if (!doctor) {
        throw new ForbiddenException('Doctor record not found');
      }
      const hasAppointment = await this.prisma.appointment.findFirst({
        where: { doctorId: doctor.id, patientId },
      });
      if (!hasAppointment) {
        throw new ForbiddenException('You do not have an appointment with this patient');
      }
    } else {
      throw new ForbiddenException('Access denied');
    }

    const records = await this.prisma.ehrRecord.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => this.decryptRecord(record));
  }

  async attachAiSummary(recordId: string, summary: string) {
    const record = await this.prisma.ehrRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      throw new NotFoundException('EHR record not found');
    }

    const updated = await this.prisma.ehrRecord.update({
      where: { id: recordId },
      data: { aiSummary: this.encryption.encrypt(summary) },
    });

    return this.decryptRecord(updated);
  }
}