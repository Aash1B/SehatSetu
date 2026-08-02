import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  PayloadTooLargeException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  MedicalReport,
  MedicalReportOcrStatus,
  MedicalReportStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import { UploadIntentDto } from './dto/upload-intent.dto';
import {
  ALLOWED_MEDICAL_REPORT_MIME_TYPES,
  AuthenticatedActor,
  MEDICAL_REPORT_BUCKET,
} from './medical-reports.types';
import {
  STORAGE_SERVICE,
  StorageService,
} from './storage/storage.service';
import { OCR_CLIENT, OcrClient } from './ocr/ocr-client';
import { MedicalReportsRepository } from './medical-reports.repository';

@Injectable()
export class MedicalReportsService {
  private readonly maxFileSizeBytes = this.positiveInteger(
    process.env.MEDICAL_REPORT_MAX_FILE_SIZE_BYTES,
    20 * 1024 * 1024,
  );
  private readonly downloadTtlSeconds = this.positiveInteger(
    process.env.MEDICAL_REPORT_DOWNLOAD_URL_TTL_SECONDS,
    300,
  );

  constructor(
    private readonly reports: MedicalReportsRepository,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
    @Inject(OCR_CLIENT) private readonly ocr: OcrClient,
  ) {}

  async getPatientContext(actor: AuthenticatedActor) {
    if (actor.role !== 'PATIENT') {
      throw new ForbiddenException('A patient account is required');
    }
    let patient = await this.reports.findPatientByUserId(actor.userId);
    if (!patient) {
      try {
        patient = await this.reports.createPatientForUser(actor.userId);
      } catch {
        patient = await this.reports.findPatientByUserId(actor.userId);
      }
    }
    if (!patient) {
      throw new NotFoundException('Patient profile could not be resolved');
    }
    return { patientId: patient.id };
  }

  async createUploadIntent(dto: UploadIntentDto, actor: AuthenticatedActor) {
    if (actor.role !== 'PATIENT') {
      throw new ForbiddenException('Only patients may upload medical reports');
    }
    this.validateUploadMetadata(dto);

    const patient = await this.reports.findPatient(dto.patientId);
    if (!patient) throw new NotFoundException('Patient was not found');
    if (patient.userId !== actor.userId) {
      throw new ForbiddenException('You cannot upload for this patient');
    }
    if (dto.appointmentId) {
      const appointment = await this.reports.findAppointment(dto.appointmentId);
      if (!appointment || appointment.patientId !== dto.patientId) {
        throw new BadRequestException(
          'Appointment does not belong to the patient',
        );
      }
    }

    const reportId = randomUUID();
    const safeName = this.buildStorageFileName(
      dto.originalFileName,
      dto.mimeType,
    );
    const storagePath = `patients/${dto.patientId}/${reportId}/${safeName}`;

    const report = await this.reports.create({
      id: reportId,
      patientId: dto.patientId,
      uploadedByUserId: actor.userId,
      appointmentId: dto.appointmentId,
      originalFileName: dto.originalFileName,
      storageBucket: MEDICAL_REPORT_BUCKET,
      storagePath,
      mimeType: dto.mimeType,
      fileSizeBytes: BigInt(dto.fileSizeBytes),
      reportType: dto.reportType,
    });

    try {
      const signed = await this.storage.createSignedUpload(
        report.storageBucket,
        report.storagePath,
      );
      return {
        reportId: report.id,
        bucket: report.storageBucket,
        storagePath: report.storagePath,
        signedUploadUrl: signed.signedUrl,
        uploadToken: signed.token,
        expiresAt: signed.expiresAt.toISOString(),
      };
    } catch (error) {
      await this.reports
        .update(report.id, {
          status: MedicalReportStatus.DELETED,
          processingErrorCode: 'STORAGE_UPLOAD_URL_FAILED',
          processingErrorMessage: 'Upload initialization failed',
        })
        .catch(() => undefined);
      throw error;
    }
  }

  async completeUpload(reportId: string, actor: AuthenticatedActor) {
    const report = await this.getAuthorizedReport(reportId, actor, true);
    if (
      new Set<MedicalReportStatus>([
        MedicalReportStatus.UPLOADED,
        MedicalReportStatus.PROCESSING,
        MedicalReportStatus.PROCESSED,
        MedicalReportStatus.OCR_FAILED,
      ]).has(report.status)
    ) {
      return this.present(report);
    }
    if (report.status !== MedicalReportStatus.PENDING_UPLOAD) {
      throw new ConflictException('Report cannot be completed in its state');
    }

    const object = await this.storage.objectExists(
      report.storageBucket,
      report.storagePath,
    );
    if (!object.exists) {
      throw new UnprocessableEntityException(
        'The uploaded report was not found',
      );
    }
    if (
      object.sizeBytes !== undefined &&
      BigInt(object.sizeBytes) !== report.fileSizeBytes
    ) {
      throw new UnprocessableEntityException(
        'The uploaded report size does not match',
      );
    }
    if (object.mimeType && object.mimeType !== report.mimeType) {
      throw new UnprocessableEntityException(
        'The uploaded report type does not match',
      );
    }

    const marked = await this.reports.updateMany(
      { id: report.id, status: MedicalReportStatus.PENDING_UPLOAD },
      {
        status: MedicalReportStatus.UPLOADED,
        uploadedAt: new Date(),
      },
    );
    if (marked.count === 0) {
      return this.present(
        await this.getAuthorizedReport(reportId, actor, true),
      );
    }
    return this.process(report.id, actor);
  }

  async list(actor: AuthenticatedActor, requestedPatientId?: string) {
    const authorization =
      actor.role === 'PATIENT'
        ? { patient: { is: { userId: actor.userId } } }
        : {
            appointment: {
              is: { doctor: { is: { userId: actor.userId } } },
            },
          };

    if (requestedPatientId) {
      await this.assertCanViewPatient(actor, requestedPatientId);
    }
    const reports = await this.reports.list({
      status: { not: MedicalReportStatus.DELETED },
      ...(requestedPatientId ? { patientId: requestedPatientId } : {}),
      ...authorization,
    });
    return reports.map((report) => this.present(report));
  }

  async get(reportId: string, actor: AuthenticatedActor) {
    return this.present(await this.getAuthorizedReport(reportId, actor));
  }

  async process(reportId: string, actor: AuthenticatedActor) {
    const existing = await this.getAuthorizedReport(reportId, actor);
    if (
      existing.status === MedicalReportStatus.PROCESSED ||
      existing.status === MedicalReportStatus.PROCESSING
    ) {
      return this.present(existing);
    }
    if (
      existing.status !== MedicalReportStatus.UPLOADED &&
      existing.status !== MedicalReportStatus.OCR_FAILED
    ) {
      throw new ConflictException('Report is not ready for OCR');
    }

    const claim = await this.reports.claimForProcessing(existing.id);
    if (claim.count === 0) {
      return this.present(
        await this.getAuthorizedReport(reportId, actor),
      );
    }

    try {
      const object = await this.storage.downloadObject(
        existing.storageBucket,
        existing.storagePath,
        this.maxFileSizeBytes,
      );
      if (BigInt(object.sizeBytes) !== existing.fileSizeBytes) {
        throw new UnprocessableEntityException(
          'Stored report size no longer matches',
        );
      }
      if (object.mimeType !== existing.mimeType) {
        throw new UnprocessableEntityException(
          'Stored report type no longer matches',
        );
      }
      const result = await this.ocr.analyze(
        object.bytes,
        existing.originalFileName,
        existing.mimeType,
      );
      const updated = await this.reports.update(existing.id, {
        status: MedicalReportStatus.PROCESSED,
        ocrStatus: MedicalReportOcrStatus.SUCCEEDED,
        extractedText: result.extractedText,
        extractedData: result.extractedData as object,
        processedAt: new Date(),
        processingErrorCode: null,
        processingErrorMessage: null,
      });
      return this.present(updated);
    } catch (error) {
      await this.reports
        .update(existing.id, {
          status: MedicalReportStatus.OCR_FAILED,
          ocrStatus: MedicalReportOcrStatus.FAILED,
          processingErrorCode: 'OCR_PROCESSING_FAILED',
          processingErrorMessage: 'Medical report processing failed',
        })
        .catch(() => undefined);
      if (
        error instanceof PayloadTooLargeException ||
        error instanceof UnprocessableEntityException
      ) {
        throw error;
      }
      throw new BadGatewayException('Medical report OCR failed');
    }
  }

  async createDownloadUrl(reportId: string, actor: AuthenticatedActor) {
    const report = await this.getAuthorizedReport(reportId, actor);
    const signed = await this.storage.createSignedDownload(
      report.storageBucket,
      report.storagePath,
      this.downloadTtlSeconds,
    );
    return {
      signedUrl: signed.signedUrl,
      expiresAt: signed.expiresAt.toISOString(),
    };
  }

  async remove(reportId: string, actor: AuthenticatedActor) {
    const report = await this.getAuthorizedReport(reportId, actor, true);
    if (report.uploadedByUserId !== actor.userId || actor.role !== 'PATIENT') {
      throw new ForbiddenException('Only the owning patient may delete a report');
    }
    if (report.status === MedicalReportStatus.DELETED) {
      return { reportId, status: MedicalReportStatus.DELETED };
    }

    await this.reports.update(report.id, {
      status: MedicalReportStatus.DELETED,
      processingErrorCode: null,
      processingErrorMessage: null,
    });
    try {
      await this.storage.deleteObject(report.storageBucket, report.storagePath);
    } catch (error) {
      await this.reports
        .update(report.id, {
          processingErrorCode: 'STORAGE_DELETE_PENDING',
          processingErrorMessage: 'Stored object deletion requires retry',
        })
        .catch(() => undefined);
      throw error;
    }
    return { reportId, status: MedicalReportStatus.DELETED };
  }

  private async getAuthorizedReport(
    reportId: string,
    actor: AuthenticatedActor,
    includeDeleted = false,
  ) {
    const report = await this.reports.findById(reportId);
    if (
      !report ||
      (!includeDeleted && report.status === MedicalReportStatus.DELETED)
    ) {
      throw new NotFoundException('Medical report was not found');
    }
    const patientOwns = report.patient.userId === actor.userId;
    const doctorAssigned =
      actor.role === 'DOCTOR' &&
      report.appointment?.doctor?.userId === actor.userId;
    if (!patientOwns && !doctorAssigned) {
      throw new ForbiddenException('You cannot access this medical report');
    }
    return report;
  }

  private async assertCanViewPatient(
    actor: AuthenticatedActor,
    patientId: string,
  ): Promise<void> {
    const patient = await this.reports.findPatient(patientId);
    if (!patient) throw new NotFoundException('Patient was not found');
    if (actor.role === 'PATIENT' && patient.userId === actor.userId) return;
    if (actor.role === 'DOCTOR') {
      const appointment = await this.reports.doctorCanAccessPatient(
        actor.userId,
        patientId,
      );
      if (appointment) return;
    }
    throw new ForbiddenException('You cannot view this patient');
  }

  private validateUploadMetadata(dto: UploadIntentDto): void {
    if (!ALLOWED_MEDICAL_REPORT_MIME_TYPES.has(dto.mimeType)) {
      throw new BadRequestException('Unsupported medical report type');
    }
    if (dto.fileSizeBytes > this.maxFileSizeBytes) {
      throw new PayloadTooLargeException('Medical report exceeds the size limit');
    }
    if (
      !dto.originalFileName.trim() ||
      dto.originalFileName.includes('/') ||
      dto.originalFileName.includes('\\') ||
      dto.originalFileName.includes('..') ||
      /[\u0000-\u001f\u007f]/.test(dto.originalFileName)
    ) {
      throw new BadRequestException('Invalid medical report filename');
    }
    const validExtensions = this.extensionsForMime(dto.mimeType);
    if (
      !validExtensions.some((extension) =>
        dto.originalFileName.toLowerCase().endsWith(extension),
      )
    ) {
      throw new BadRequestException(
        'Medical report extension does not match its MIME type',
      );
    }
  }

  private buildStorageFileName(name: string, mimeType: string): string {
    const extension = this.extensionForMime(mimeType);
    const stem = name
      .slice(0, -extension.length)
      .normalize('NFKD')
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
    return `${stem || 'report'}-${randomUUID()}${extension}`;
  }

  private extensionForMime(mimeType: string): string {
    return this.extensionsForMime(mimeType)[0];
  }

  private extensionsForMime(mimeType: string): string[] {
    return {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    }[mimeType]!;
  }

  private present(report: MedicalReport | Record<string, any>) {
    return {
      id: report.id,
      patientId: report.patientId,
      appointmentId: report.appointmentId,
      originalFileName: report.originalFileName,
      mimeType: report.mimeType,
      fileSizeBytes: Number(report.fileSizeBytes),
      reportType: report.reportType,
      status: report.status,
      ocrStatus: report.ocrStatus,
      extractedText: report.extractedText,
      extractedData: report.extractedData,
      processingErrorCode: report.processingErrorCode,
      processingErrorMessage: report.processingErrorMessage,
      createdAt: report.createdAt,
      uploadedAt: report.uploadedAt,
      processingStartedAt: report.processingStartedAt,
      processedAt: report.processedAt,
      updatedAt: report.updatedAt,
    };
  }

  private positiveInteger(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
  }
}
