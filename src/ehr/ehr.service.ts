import { Injectable, Logger, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CreateEhrRecordDto } from './dto/create-ehr-record.dto';

@Injectable()
export class EhrService {
  private readonly logger = new Logger(EhrService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  private decryptRecord<T extends { diagnosis: string | null; notes: string | null; aiSummary: string | null }>(
    record: T,
  ): T {
    let structuredData = (record as any).structuredData;
    const rx = (record as any).appointment?.prescription;
    if (rx && Array.isArray(rx.medicines) && rx.medicines.length > 0) {
      const existingMeds = structuredData?.medications;
      if (!existingMeds || (Array.isArray(existingMeds) && existingMeds.length === 0)) {
        const meds = (rx.medicines as any[]).map((m: any) => {
          if (typeof m === 'string') return m;
          const parts = [
            m.name,
            m.dosage,
            m.frequency ? `(${m.frequency})` : '',
            m.timing ? `[${m.timing}]` : '',
            m.duration ? `for ${m.duration}` : '',
          ].filter(Boolean);
          return parts.join(' ');
        }).filter(Boolean);
        structuredData = { ...(structuredData || {}), medications: meds };
      }
    }

    const decryptedDiagnosis = this.encryption.decrypt(record.diagnosis);
    const diagnosis = decryptedDiagnosis || rx?.diagnosis || (record as any).appointment?.healthConcern || null;

    return {
      ...record,
      diagnosis,
      notes: this.encryption.decrypt(record.notes),
      aiSummary: this.encryption.decrypt(record.aiSummary),
      ...(structuredData ? { structuredData } : {}),
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
    // Patients must never see DRAFT or REJECTED records; only doctor-verified
    // records are safe for direct patient consumption. Enforced here at the
    // query level, not left to the caller/frontend to filter.
    let statusFilter: string | undefined;

    if (requestingRole === 'PATIENT') {
      const patient = await this.prisma.patient.findUnique({ where: { userId: requestingUserId } });
      if (!patient || patient.id !== patientId) {
        throw new ForbiddenException('You can only view your own EHR history');
      }
      statusFilter = 'VERIFIED';
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
      where: { patientId, ...(statusFilter ? { status: statusFilter } : {}) },
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

  /**
   * Resolves the authenticated user to their Doctor profile, or throws.
   * Mirrors the existing pattern used elsewhere in the codebase (see
   * MchService.assertDoctorRole) for authorizing doctor-only actions.
   */
  private async assertDoctorRole(requestingUserId: string, requestingRole: string): Promise<string> {
    if (requestingRole !== 'DOCTOR') {
      throw new ForbiddenException('Only doctors can perform this action');
    }
    const doctor = await this.prisma.doctor.findUnique({
      where: { userId: requestingUserId },
      select: { id: true },
    });
    if (!doctor) {
      throw new ForbiddenException('Doctor profile not found');
    }
    return doctor.id;
  }

  /**
   * Minimal patient/report context attached to draft responses so the doctor
   * review UI has enough information to display without a separate lookup.
   * Not a new endpoint — just an `include` on the existing draft queries.
   */
  private readonly draftReviewInclude = {
    patient: {
      select: {
        id: true,
        user: { select: { fullName: true, email: true } },
      },
    },
    medicalReport: {
      select: {
        id: true,
        originalFileName: true,
        reportType: true,
        createdAt: true,
      },
    },
    appointment: {
      include: {
        prescription: true,
      },
    },
  } as const;

  /**
   * Lists EHR drafts (status = DRAFT) awaiting doctor review.
   * Filtered by requesting doctor: a doctor only sees pending EHR drafts for patients
   * who have booked appointments/consultations with this doctor.
   */
  async listPendingDrafts(requestingUserId: string, requestingRole: string) {
    const doctorId = await this.assertDoctorRole(requestingUserId, requestingRole);

    const records = await this.prisma.ehrRecord.findMany({
      where: {
        status: 'DRAFT',
        OR: [
          { appointment: { doctorId } },
          { patient: { appointments: { some: { doctorId } } } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: this.draftReviewInclude,
    });

    return records.map((record) => this.decryptRecord(record));
  }

  /**
   * Returns a single EHR draft's details for doctor review.
   */
  async getDraftForReview(recordId: string, requestingUserId: string, requestingRole: string) {
    const doctorId = await this.assertDoctorRole(requestingUserId, requestingRole);

    const record = await this.prisma.ehrRecord.findFirst({
      where: {
        id: recordId,
        OR: [
          { appointment: { doctorId } },
          { patient: { appointments: { some: { doctorId } } } },
        ],
      },
      include: this.draftReviewInclude,
    });
    if (!record) {
      throw new NotFoundException('EHR record not found or access denied');
    }

    return this.decryptRecord(record);
  }

  /**
   * Approves a DRAFT EHR record. Sets status=VERIFIED, verifiedByDoctorId,
   * and verifiedAt. Only records currently in DRAFT status may be approved.
   */
  async approveDraft(recordId: string, requestingUserId: string, requestingRole: string) {
    const doctorId = await this.assertDoctorRole(requestingUserId, requestingRole);

    const record = await this.prisma.ehrRecord.findFirst({
      where: {
        id: recordId,
        OR: [
          { appointment: { doctorId } },
          { patient: { appointments: { some: { doctorId } } } },
        ],
      },
    });
    if (!record) {
      throw new NotFoundException('EHR record not found or access denied');
    }
    if (record.status !== 'DRAFT') {
      throw new ConflictException(`Only DRAFT records can be approved (current status: ${record.status})`);
    }

    const updated = await this.prisma.ehrRecord.update({
      where: { id: recordId },
      data: {
        status: 'VERIFIED',
        verifiedByDoctorId: doctorId,
        verifiedAt: new Date(),
      },
    });

    return this.decryptRecord(updated);
  }

  /**
   * Rejects a DRAFT EHR record. Sets status=REJECTED.
   */
  async rejectDraft(recordId: string, reason: string | undefined, requestingUserId: string, requestingRole: string) {
    const doctorId = await this.assertDoctorRole(requestingUserId, requestingRole);

    const record = await this.prisma.ehrRecord.findFirst({
      where: {
        id: recordId,
        OR: [
          { appointment: { doctorId } },
          { patient: { appointments: { some: { doctorId } } } },
        ],
      },
    });
    if (!record) {
      throw new NotFoundException('EHR record not found or access denied');
    }
    if (record.status !== 'DRAFT') {
      throw new ConflictException(`Only DRAFT records can be rejected (current status: ${record.status})`);
    }

    const existingNotes = this.encryption.decrypt(record.notes);
    const combinedNotes = reason
      ? [existingNotes, `Rejected by doctor: ${reason}`].filter(Boolean).join('\n')
      : existingNotes;

    const updated = await this.prisma.ehrRecord.update({
      where: { id: recordId },
      data: {
        status: 'REJECTED',
        notes: this.encryption.encrypt(combinedNotes),
      },
    });

    return this.decryptRecord(updated);
  }

  /**
   * Creates a DRAFT EhrRecord from AI-parsed OCR output of a medical report.
   * Intended to be called by the medical-reports pipeline after OCR + AI
   * parsing complete. Never throws on bad input: returns null instead so the
   * OCR pipeline is never broken by EHR draft creation.
   *
   * A draft is only created when there is at least one usable clinical field
   * (diagnosis, notes, or non-empty structuredData) — this avoids persisting
   * empty/meaningless EHR records when OCR text was unusable or AI parsing
   * failed/returned malformed data.
   */
  async createDraftFromOcr(params: {
    patientId: string;
    medicalReportId: string;
    diagnosis: string | null;
    notes: string | null;
    structuredData: Record<string, unknown> | null;
  }) {
    const { patientId, medicalReportId, diagnosis, notes, structuredData } = params;

    const hasStructuredData =
      !!structuredData &&
      Object.values(structuredData).some((value) => {
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return true;
      });

    if (!diagnosis && !notes && !hasStructuredData) {
      this.logger.warn('Skipping EHR draft creation: no usable clinical data', {
        medicalReportId,
      });
      return null;
    }

    try {
      const record = await this.prisma.ehrRecord.create({
        data: {
          patientId,
          medicalReportId,
          status: 'DRAFT',
          diagnosis: this.encryption.encrypt(diagnosis),
          notes: this.encryption.encrypt(notes),
          structuredData: (structuredData ?? undefined) as Prisma.InputJsonValue | undefined,
        },
      });
      return this.decryptRecord(record);
    } catch (error) {
      // Never let a persistence failure here break the OCR/report pipeline.
      this.logger.error('Failed to create EHR draft record', {
        medicalReportId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }
}