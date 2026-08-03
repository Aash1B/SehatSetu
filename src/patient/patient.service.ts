import { BadRequestException, Inject, Injectable, NotFoundException, PayloadTooLargeException } from '@nestjs/common';
import { prisma } from '../prisma';
import { randomUUID } from 'crypto';
import { STORAGE_SERVICE, StorageService } from '../medical-reports/storage/storage.service';
import { MEDICAL_REPORT_BUCKET } from '../medical-reports/medical-reports.types';

export interface UpdatePatientProfileDto {
  fullName?: string;
  phone?: string;
  gender?: string;
  dateOfBirth?: string;
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
  constructor(@Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}

  private get storageBucket() {
    return process.env.SUPABASE_STORAGE_BUCKET || MEDICAL_REPORT_BUCKET;
  }

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

    let profileImageUrl: string | null = null;
    if (patient.profileImagePath) {
      profileImageUrl = (await this.storage.createSignedDownload(
        this.storageBucket,
        patient.profileImagePath,
        3600,
      ).catch(() => null))?.signedUrl || null;
    }

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      ...patient,
      profileImageUrl,
    };
  }

  async createAvatarUploadIntent(
    userId: string,
    body: { fileName?: string; mimeType?: string; fileSizeBytes?: number },
  ) {
    const allowedTypes: Record<string, string> = {
      'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp',
    };
    const extension = body.mimeType ? allowedTypes[body.mimeType] : undefined;
    if (!extension) throw new BadRequestException('Choose a JPEG, PNG, or WebP image');
    if (!body.fileSizeBytes || body.fileSizeBytes > 5 * 1024 * 1024) {
      throw new PayloadTooLargeException('Profile image must be 5 MB or smaller');
    }
    const profile = await this.getProfile(userId);
    const uploadId = randomUUID();
    const path = `profile-pictures/${profile.id}/${uploadId}.${extension}`;
    const signed = await this.storage.createSignedUpload(this.storageBucket, path);
    return { uploadId, path, signedUploadUrl: signed.signedUrl };
  }

  async completeAvatarUpload(userId: string, uploadId: string, path?: string) {
    const profile = await this.getProfile(userId);
    const expectedPrefix = `profile-pictures/${profile.id}/${uploadId}.`;
    if (!path || !path.startsWith(expectedPrefix) || path.includes('..')) {
      throw new BadRequestException('Invalid profile image upload');
    }
    const object = await this.storage.objectExists(this.storageBucket, path);
    if (!object.exists || !object.mimeType?.startsWith('image/')) {
      throw new BadRequestException('Uploaded profile image was not found');
    }
    const previousPath = profile.profileImagePath as string | null;
    await prisma.patient.update({ where: { id: profile.id }, data: { profileImagePath: path } });
    if (previousPath && previousPath !== path) {
      await this.storage.deleteObject(this.storageBucket, previousPath).catch(() => undefined);
    }
    const signed = await this.storage.createSignedDownload(this.storageBucket, path, 3600);
    return { profileImagePath: path, profileImageUrl: signed.signedUrl };
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
        ...(dto.dateOfBirth !== undefined && {
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        }),
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

    // A scheduled consultation stays upcoming through its full 45-minute join
    // window. If it was never completed after that window, treat it as missed.
    await prisma.appointment.updateMany({
      where: {
        patientId: profile.id,
        status: { in: ['SCHEDULED', 'WAITING'] },
        scheduledAt: { lt: new Date(Date.now() - 45 * 60 * 1000) },
      },
      data: { status: 'CANCELLED' },
    });

    const appointments = await prisma.appointment.findMany({
      where: {
        patientId: profile.id,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        doctor: { include: { user: true } },
        ehrRecord: true,
        prescription: {
          include: { doctor: { include: { user: true } } },
        },
        payment: true,
      },
    });

    const [ehrRecords, prescriptions, medicalReports, payments] = await Promise.all([
      prisma.ehrRecord.findMany({
        where: { patientId: profile.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.prescription.findMany({
        where: { patientId: profile.id },
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: { include: { user: true } },
          appointment: { include: { ehrRecord: true } },
        },
      }),
      prisma.medicalReport.findMany({
        where: { patientId: profile.id, status: { not: 'DELETED' } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.payment.findMany({
        where: { patientId: profile.id },
        orderBy: { createdAt: 'desc' },
        include: { appointment: { include: { doctor: true } } },
      }),
    ]);

    return {
      profile,
      appointments,
      ehrRecords,
      prescriptions,
      medicalReports: medicalReports.map(({ fileSizeBytes, ...report }) => ({
        ...report,
        fileSizeBytes: fileSizeBytes.toString(),
      })),
      payments,
    };
  }
}
