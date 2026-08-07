import {
  ConflictException,
  GoneException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { STORAGE_SERVICE, StorageService } from '../medical-reports/storage/storage.service';
import { MEDICAL_REPORT_BUCKET } from '../medical-reports/medical-reports.types';
import { Prisma } from '@prisma/client';

const PURPOSE = 'ACCOUNT_DELETION';
const MAX_ATTEMPTS = 5;

@Injectable()
export class AccountDeletionService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: ReturnType<typeof setInterval>;
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  onModuleInit() {
    void this.retryPendingStorageCleanup();
    this.cleanupTimer = setInterval(() => void this.retryPendingStorageCleanup(), 5 * 60 * 1000);
    this.cleanupTimer.unref?.();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  private async retryPendingStorageCleanup() {
    const pending = await this.prisma.storageCleanupJob.findMany({
      where: { status: 'PENDING', attempts: { lt: 10 } }, orderBy: { createdAt: 'asc' }, take: 50,
    }).catch(() => []);
    await Promise.all(pending.map(async (item) => {
      try {
        await this.storage.deleteObject(item.bucket, item.path);
        await this.prisma.storageCleanupJob.update({ where: { id: item.id }, data: { status: 'COMPLETED', attempts: { increment: 1 }, completedAt: new Date(), lastError: null } });
      } catch (error) {
        await this.prisma.storageCleanupJob.update({ where: { id: item.id }, data: { attempts: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 500) : 'Storage cleanup failed' } }).catch(() => undefined);
      }
    }));
  }

  private get expiryMinutes() {
    return Math.max(5, Math.min(10, Number(process.env.ACCOUNT_DELETION_OTP_EXPIRY_MINUTES) || 10));
  }

  private get resendSeconds() {
    return Math.max(30, Number(process.env.ACCOUNT_DELETION_OTP_RESEND_SECONDS) || 60);
  }

  private maskEmail(email: string) {
    const [name, domain = ''] = email.split('@');
    return `${name.slice(0, 2)}${'*'.repeat(Math.max(3, name.length - 2))}@${domain}`;
  }

  async requestOtp(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('This account is not active');
    }
    if (!user.emailVerified) throw new ConflictException('Verify your email before deleting your account');

    const now = new Date();
    await this.prisma.accountDeletionOtp.deleteMany({
      where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } },
    });
    const cooldownStart = new Date(now.getTime() - this.resendSeconds * 1000);
    const recent = await this.prisma.accountDeletionOtp.findFirst({
      where: { userId, purpose: PURPOSE, createdAt: { gte: cooldownStart } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) throw new HttpException(`Please wait ${this.resendSeconds} seconds before requesting another code`, HttpStatus.TOO_MANY_REQUESTS);
    const hourlyCount = await this.prisma.accountDeletionOtp.count({
      where: { userId, purpose: PURPOSE, createdAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
    });
    if (hourlyCount >= 5) throw new HttpException('Too many deletion-code requests. Try again later', HttpStatus.TOO_MANY_REQUESTS);

    const otp = randomInt(100000, 1000000).toString();
    const otpHash = await bcrypt.hash(otp, 12);
    const expiresAt = new Date(now.getTime() + this.expiryMinutes * 60 * 1000);
    const created = await this.prisma.$transaction(async (tx) => {
      await tx.accountDeletionOtp.updateMany({
        where: { userId, purpose: PURPOSE, consumedAt: null },
        data: { consumedAt: now },
      });
      return tx.accountDeletionOtp.create({ data: { userId, otpHash, purpose: PURPOSE, expiresAt } });
    });
    try {
      await this.mail.sendMail(
        user.email,
        'Confirm deletion of your SehatSetu account',
        `<p>Hi ${user.fullName},</p><p>Your account deletion verification code is:</p><h2 style="letter-spacing:4px">${otp}</h2><p>This code expires in ${this.expiryMinutes} minutes. If you did not request deletion, secure your account immediately.</p>`,
      );
    } catch (error) {
      await this.prisma.accountDeletionOtp.delete({ where: { id: created.id } }).catch(() => undefined);
      throw error;
    }
    return { maskedDestination: this.maskEmail(user.email), expiresAt, resendAfterSeconds: this.resendSeconds };
  }

  async confirm(userId: string, otp: string, confirmation: string) {
    if (confirmation !== 'DELETE') throw new ConflictException('Type DELETE exactly to confirm account deletion');
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, include: { patient: true, doctor: true },
    });
    if (!user) return { deleted: true, message: 'Your account has been permanently deleted.' };
    if (user.accountStatus === 'DELETED') return { deleted: true, message: 'Your account has been permanently deleted.' };

    const verification = await this.prisma.accountDeletionOtp.findFirst({
      where: { userId, purpose: PURPOSE, consumedAt: null }, orderBy: { createdAt: 'desc' },
    });
    if (!verification || verification.expiresAt <= new Date()) throw new GoneException('The verification code has expired. Request a new code');
    if (verification.attempts >= MAX_ATTEMPTS) throw new HttpException('Too many incorrect attempts. Request a new code', HttpStatus.TOO_MANY_REQUESTS);
    const matches = await bcrypt.compare(otp, verification.otpHash);
    if (!matches) {
      const updated = await this.prisma.accountDeletionOtp.update({
        where: { id: verification.id }, data: { attempts: { increment: 1 } },
      });
      if (updated.attempts >= MAX_ATTEMPTS) throw new HttpException('Too many incorrect attempts. Request a new code', HttpStatus.TOO_MANY_REQUESTS);
      throw new UnauthorizedException('Incorrect verification code');
    }

    if (user.role === 'DOCTOR' && user.doctor) {
      const activeAppointments = await this.prisma.appointment.count({
        where: { doctorId: user.doctor.id, status: { in: ['SCHEDULED', 'WAITING'] } },
      });
      if (activeAppointments > 0) {
        throw new ConflictException(`Resolve or cancel ${activeAppointments} upcoming consultation${activeAppointments === 1 ? '' : 's'} before deleting your account`);
      }
    }

    const cleanupItems: Array<{ bucket: string; path: string }> = [];
    if (user.patient?.profileImagePath) cleanupItems.push({ bucket: process.env.SUPABASE_STORAGE_BUCKET || MEDICAL_REPORT_BUCKET, path: user.patient.profileImagePath });
    if (user.patient) {
      const reports = await this.prisma.medicalReport.findMany({
        where: { patientId: user.patient.id }, select: { storageBucket: true, storagePath: true },
      });
      cleanupItems.push(...reports.map((item) => ({ bucket: item.storageBucket, path: item.storagePath })));
    }
    if (user.doctor?.availability && typeof user.doctor.availability === 'object') {
      const documents = (user.doctor.availability as { documents?: Array<{ storageBucket?: string; storagePath?: string }> }).documents || [];
      for (const document of documents) if (document.storageBucket && document.storagePath) cleanupItems.push({ bucket: document.storageBucket, path: document.storagePath });
    }
    const uniqueCleanupItems = [...new Map(cleanupItems.map((item) => [`${item.bucket}\u0000${item.path}`, item])).values()];

    const deletedEmail = `deleted-${createHash('sha256').update(user.id).digest('hex').slice(0, 24)}@sehatsetu.invalid`;
    const auditIdentifier = createHash('sha256').update(`account-deletion:${user.id}`).digest('hex');
    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.accountDeletionOtp.updateMany({ where: { id: verification.id, consumedAt: null }, data: { consumedAt: new Date() } });
      if (claimed.count !== 1) {
        const current = await tx.user.findUnique({ where: { id: userId }, select: { accountStatus: true } });
        if (!current || current.accountStatus === 'DELETED') return { alreadyDeleted: true };
        throw new ConflictException('This verification code has already been used');
      }
      if (user.patient) {
        await tx.appointment.updateMany({
          where: { patientId: user.patient.id, status: { in: ['SCHEDULED', 'WAITING'] } },
          data: { status: 'CANCELLED' },
        });
        await tx.appointment.updateMany({ where: { patientId: user.patient.id }, data: {
          patientName: null, patientAge: null, patientGender: null, patientHeight: null,
          patientWeight: null, patientBloodGroup: null, patientPhone: null, patientEmail: null, notes: null,
        } });
        await tx.medicalReport.deleteMany({ where: { patientId: user.patient.id } });
        await tx.patient.update({ where: { id: user.patient.id }, data: {
          gender: null, dateOfBirth: null, allergies: [], chronicConditions: [], age: null,
          bloodGroup: null, emergencyContact: null, height: null, phone: null, weight: null, profileImagePath: null,
        } });
      }
      if (user.doctor) {
        await tx.doctor.update({ where: { id: user.doctor.id }, data: {
          name: 'Deleted clinician', availability: Prisma.JsonNull, availableToday: false, imageUrl: null,
          hospital: null, location: null, tags: [],
        } });
      }
      for (const item of uniqueCleanupItems) {
        await tx.storageCleanupJob.upsert({ where: { bucket_path: item }, create: item, update: { status: 'PENDING', lastError: null } });
      }
      await tx.accountDeletionAudit.create({ data: { userIdentifier: auditIdentifier, role: user.role, outcome: 'ANONYMIZED' } });
      await tx.accountDeletionOtp.deleteMany({ where: { userId } });
      await tx.user.update({ where: { id: userId }, data: {
        email: deletedEmail, fullName: user.role === 'DOCTOR' ? 'Deleted clinician' : 'Deleted patient',
        passwordHash: randomBytes(48).toString('hex'), dataConsentGiven: false, dataConsentAt: null,
        emailVerified: false, emailOtpHash: null, emailOtpExpiresAt: null,
        resetTokenHash: null, resetTokenExpiresAt: null, accountStatus: 'DELETED',
        deletedAt: new Date(), tokenVersion: { increment: 1 },
      } });
      return { alreadyDeleted: false };
    });

    if (transactionResult.alreadyDeleted) return { deleted: true, message: 'Your account has been permanently deleted.' };

    await Promise.all(uniqueCleanupItems.map(async (item) => {
      try {
        await this.storage.deleteObject(item.bucket, item.path);
        await this.prisma.storageCleanupJob.update({ where: { bucket_path: item }, data: { status: 'COMPLETED', attempts: { increment: 1 }, completedAt: new Date() } });
      } catch (error) {
        await this.prisma.storageCleanupJob.update({ where: { bucket_path: item }, data: {
          status: 'PENDING', attempts: { increment: 1 }, lastError: error instanceof Error ? error.message.slice(0, 500) : 'Storage cleanup failed',
        } }).catch(() => undefined);
      }
    }));
    return { deleted: true, message: 'Your account has been permanently deleted.' };
  }
}
