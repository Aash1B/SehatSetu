import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralStatusDto } from './dto/update-referral-status.dto';

@Injectable()
export class ReferralsService {
  private readonly logger = new Logger(ReferralsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createReferral(dto: CreateReferralDto, doctorUserId?: string) {
    let doctorId = dto.referredByDoctorId;

    if (!doctorId && doctorUserId) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: doctorUserId },
      });
      if (doctor) {
        doctorId = doctor.id;
      }
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${dto.patientId} not found`);
    }

    const referral = await this.prisma.referral.create({
      data: {
        patientId: dto.patientId,
        referredByDoctorId: doctorId || null,
        appointmentId: dto.appointmentId || null,
        recommendedFacility: dto.recommendedFacility,
        facilityType: dto.facilityType || 'GOVERNMENT',
        reason: dto.reason,
        status: dto.status || 'PENDING',
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : null,
        followUpNotes: dto.followUpNotes || null,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            village: true,
            gender: true,
            age: true,
            phone: true,
          },
        },
        referredByDoctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            hospital: true,
          },
        },
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            healthConcern: true,
          },
        },
      },
    });

    this.logger.log(`Created referral ${referral.id} for patient ${dto.patientId} to ${dto.recommendedFacility}`);
    return referral;
  }

  async updateStatus(id: string, dto: UpdateReferralStatusDto) {
    const existing = await this.prisma.referral.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Referral with ID ${id} not found`);
    }

    const completedAt =
      dto.status === 'COMPLETED'
        ? dto.completedAt
          ? new Date(dto.completedAt)
          : new Date()
        : dto.completedAt
          ? new Date(dto.completedAt)
          : existing.completedAt;

    const scheduledDate = dto.scheduledDate
      ? new Date(dto.scheduledDate)
      : existing.scheduledDate;

    const updated = await this.prisma.referral.update({
      where: { id },
      data: {
        status: dto.status,
        scheduledDate,
        completedAt,
        followUpNotes: dto.followUpNotes ?? existing.followUpNotes,
      },
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            village: true,
            gender: true,
            age: true,
            phone: true,
          },
        },
        referredByDoctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            hospital: true,
          },
        },
      },
    });

    this.logger.log(`Updated referral ${id} status to ${dto.status}`);
    return updated;
  }

  async getPatientReferrals(patientId: string) {
    return this.prisma.referral.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        referredByDoctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            hospital: true,
          },
        },
        appointment: {
          select: {
            id: true,
            scheduledAt: true,
            healthConcern: true,
          },
        },
      },
    });
  }

  async getReferrals(query: { status?: string; facilityType?: string; limit?: number }) {
    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }
    if (query.facilityType) {
      where.facilityType = query.facilityType;
    }

    return this.prisma.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: query.limit ? Number(query.limit) : 50,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            village: true,
            gender: true,
            age: true,
            phone: true,
          },
        },
        referredByDoctor: {
          select: {
            id: true,
            name: true,
            specialty: true,
            hospital: true,
          },
        },
      },
    });
  }

  async getReferralById(id: string) {
    const referral = await this.prisma.referral.findUnique({
      where: { id },
      include: {
        patient: true,
        referredByDoctor: true,
        appointment: true,
      },
    });

    if (!referral) {
      throw new NotFoundException(`Referral with ID ${id} not found`);
    }

    return referral;
  }

  async autoCreateEmergencyReferral(params: {
    patientId: string;
    recommendedFacility: string;
    facilityType?: string;
    reason?: string;
    appointmentId?: string;
  }) {
    try {
      return await this.prisma.referral.create({
        data: {
          patientId: params.patientId,
          recommendedFacility: params.recommendedFacility,
          facilityType: params.facilityType || 'GOVERNMENT',
          reason: params.reason || 'Emergency medical triage escalation',
          status: 'PENDING',
          appointmentId: params.appointmentId || null,
        },
      });
    } catch (err) {
      this.logger.error(`Failed to auto-create emergency referral: ${err.message}`, err.stack);
      return null;
    }
  }
}
