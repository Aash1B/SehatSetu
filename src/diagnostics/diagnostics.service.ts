import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiagnosticOrderDto } from './dto/create-diagnostic-order.dto';
import { UploadDiagnosticReportDto } from './dto/upload-diagnostic-report.dto';
import { ReviewDiagnosticOrderDto } from './dto/review-diagnostic-order.dto';

@Injectable()
export class DiagnosticsService {
  private readonly logger = new Logger(DiagnosticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateDiagnosticOrderDto, doctorUserId?: string) {
    let doctorId = dto.orderedByDoctorId;

    if (!doctorId && doctorUserId) {
      const doctor = await this.prisma.doctor.findUnique({
        where: { userId: doctorUserId },
      });
      if (doctor) {
        doctorId = doctor.id;
      }
    }

    if (!doctorId) {
      // Fallback to first available doctor in database if not found
      const fallbackDoctor = await this.prisma.doctor.findFirst();
      doctorId = fallbackDoctor?.id;
    }

    if (!doctorId) {
      throw new NotFoundException('No doctor found to order diagnostic test.');
    }

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${dto.patientId} not found`);
    }

    const order = await this.prisma.diagnosticOrder.create({
      data: {
        patientId: dto.patientId,
        orderedByDoctorId: doctorId,
        appointmentId: dto.appointmentId || null,
        testName: dto.testName,
        testType: dto.testType,
        instructions: dto.instructions || null,
        status: 'ORDERED',
      },
      include: {
        patient: {
          select: { id: true, name: true, gender: true, age: true, phone: true },
        },
        orderedByDoctor: {
          select: { id: true, name: true, specialty: true, hospital: true },
        },
      },
    });

    this.logger.log(`Created diagnostic order ${order.id} (${dto.testName}) for patient ${dto.patientId}`);
    return order;
  }

  async getPatientOrders(patientId: string) {
    return this.prisma.diagnosticOrder.findMany({
      where: { patientId },
      orderBy: { orderedAt: 'desc' },
      include: {
        orderedByDoctor: {
          select: { id: true, name: true, specialty: true, hospital: true },
        },
        appointment: {
          select: { id: true, scheduledAt: true, healthConcern: true },
        },
      },
    });
  }

  async getOrderById(id: string) {
    const order = await this.prisma.diagnosticOrder.findUnique({
      where: { id },
      include: {
        patient: true,
        orderedByDoctor: true,
        appointment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Diagnostic order with ID ${id} not found`);
    }

    return order;
  }

  async uploadReport(id: string, dto: UploadDiagnosticReportDto) {
    const existing = await this.prisma.diagnosticOrder.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Diagnostic order with ID ${id} not found`);
    }

    let reportUrl = dto.reportFileUrl || null;
    let summary = dto.resultSummary || null;

    if (dto.reportId) {
      const report = await this.prisma.medicalReport.findUnique({
        where: { id: dto.reportId },
      });
      if (report) {
        reportUrl = reportUrl || report.storagePath;
        if (!summary && report.extractedText) {
          summary = report.extractedText.slice(0, 300);
        }
      }
    }

    const updated = await this.prisma.diagnosticOrder.update({
      where: { id },
      data: {
        status: 'REPORT_UPLOADED',
        reportFileUrl: reportUrl || existing.reportFileUrl,
        resultSummary: summary ?? existing.resultSummary,
        resultAt: new Date(),
      },
      include: {
        orderedByDoctor: true,
        patient: true,
      },
    });

    this.logger.log(`Diagnostic order ${id} report uploaded`);
    return updated;
  }

  async reviewOrder(id: string, dto: ReviewDiagnosticOrderDto, doctorUserId?: string) {
    const order = await this.prisma.diagnosticOrder.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!order) {
      throw new NotFoundException(`Diagnostic order with ID ${id} not found`);
    }

    let doctorId: string | null = null;
    if (doctorUserId) {
      const doc = await this.prisma.doctor.findUnique({
        where: { userId: doctorUserId },
      });
      doctorId = doc?.id || null;
    }

    const updatedOrder = await this.prisma.diagnosticOrder.update({
      where: { id },
      data: {
        status: 'REVIEWED',
        resultSummary: dto.resultSummary,
        resultAt: new Date(),
      },
      include: {
        orderedByDoctor: true,
        patient: true,
      },
    });

    // Write resultSummary into linked EhrRecord
    try {
      const diagnosticNote = `[Diagnostic Review: ${order.testName} (${order.testType})] Result: ${dto.resultSummary}`;

      if (order.appointmentId) {
        const existingEhr = await this.prisma.ehrRecord.findUnique({
          where: { appointmentId: order.appointmentId },
        });

        if (existingEhr) {
          const newNotes = existingEhr.notes
            ? `${existingEhr.notes}\n\n${diagnosticNote}`
            : diagnosticNote;

          await this.prisma.ehrRecord.update({
            where: { id: existingEhr.id },
            data: {
              notes: newNotes,
              verifiedByDoctorId: doctorId || existingEhr.verifiedByDoctorId,
              verifiedAt: new Date(),
            },
          });
        } else {
          await this.prisma.ehrRecord.create({
            data: {
              patientId: order.patientId,
              appointmentId: order.appointmentId,
              notes: diagnosticNote,
              diagnosis: `Post-Diagnostic: ${order.testName}`,
              status: 'VERIFIED',
              verifiedByDoctorId: doctorId,
              verifiedAt: new Date(),
            },
          });
        }
      } else {
        // Find latest EhrRecord for patient
        const latestEhr = await this.prisma.ehrRecord.findFirst({
          where: { patientId: order.patientId },
          orderBy: { createdAt: 'desc' },
        });

        if (latestEhr) {
          const newNotes = latestEhr.notes
            ? `${latestEhr.notes}\n\n${diagnosticNote}`
            : diagnosticNote;

          await this.prisma.ehrRecord.update({
            where: { id: latestEhr.id },
            data: {
              notes: newNotes,
              verifiedByDoctorId: doctorId || latestEhr.verifiedByDoctorId,
            },
          });
        }
      }
      this.logger.log(`Diagnostic order ${id} reviewed and synced to EHR`);
    } catch (err: any) {
      this.logger.warn(`Failed syncing diagnostic result to EhrRecord: ${err?.message}`);
    }

    return updatedOrder;
  }

  async getAllOrders(status?: string, limit?: number) {
    const where: any = {};
    if (status) {
      where.status = status;
    }

    return this.prisma.diagnosticOrder.findMany({
      where,
      orderBy: { orderedAt: 'desc' },
      take: limit ? Number(limit) : 50,
      include: {
        patient: {
          select: { id: true, name: true, gender: true, age: true, phone: true },
        },
        orderedByDoctor: {
          select: { id: true, name: true, specialty: true, hospital: true },
        },
      },
    });
  }
}
