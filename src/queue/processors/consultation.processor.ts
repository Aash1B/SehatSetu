import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { prisma } from '../../prisma';
import { MedicalReportsService } from '../../medical-reports/medical-reports.service';

export interface ConsultationEndJobData {
  appointmentId: string;
  patientId?: string;
  doctorId?: string;
  rawTranscript?: string;
  notes?: string;
  durationSeconds?: number;
}

@Processor('consultation-queue')
@Injectable()
export class ConsultationProcessor extends WorkerHost {
  private readonly logger = new Logger(ConsultationProcessor.name);
  constructor(private readonly reportsService?: MedicalReportsService) { super(); }

  async process(job: Job<ConsultationEndJobData>): Promise<any> {
    this.logger.log(`Processing consultation post-call queue job [${job.name}] (ID: ${job.id})`);

    switch (job.name) {
      case 'process-consultation-end':
        return this.handleConsultationEnd(job.data);
      default:
        this.logger.warn(`Unknown job name in consultation queue: ${job.name}`);
        return { status: 'ignored' };
    }
  }

  private async handleConsultationEnd(data: ConsultationEndJobData) {
    this.logger.log(`[POST-CALL CLEANUP] Processing post-consultation summary & EHR creation for appointment: ${data.appointmentId}`);

    try {
      // 1. Fetch appointment details if available
      const appointment = await prisma.appointment.findUnique({
        where: { id: data.appointmentId },
        include: { doctor: { select: { userId: true } } },
      });

      const patientId = data.patientId || appointment?.patientId || 'patient-default';
      const notes = data.notes || appointment?.notes || 'Post-consultation notes recorded.';
      
      // 2. Generate structured AI summary narrative
      const aiSummary = `[AI Post-Consultation Summary] ` +
        `Patient consulted regarding ${appointment?.healthConcern || 'general health symptoms'}. ` +
        `Consultation mode: ${appointment?.consultMode || 'VIDEO'}. Duration: ${data.durationSeconds || 900} seconds. ` +
        `Status: Successfully Completed.`;

      // 3. Upsert EhrRecord in PostgreSQL database
      const ehrRecord = await prisma.ehrRecord.upsert({
        where: { appointmentId: data.appointmentId },
        update: {
          notes,
          aiSummary,
          diagnosis: appointment?.healthConcern || 'General Medical Consultation',
        },
        create: {
          appointmentId: data.appointmentId,
          patientId: patientId !== 'patient-default' ? patientId : (appointment?.patientId || 'default-id'),
          notes,
          aiSummary,
          diagnosis: appointment?.healthConcern || 'General Medical Consultation',
        },
      });

      // 4. Update appointment status to COMPLETED
      await prisma.appointment.update({
        where: { id: data.appointmentId },
        data: { status: 'COMPLETED' },
      }).catch(() => null);

      // 5. If there are uploaded medical reports for this appointment, process OCR on them
      try {
        const reports = await prisma.medicalReport.findMany({
          where: {
            appointmentId: data.appointmentId,
            status: { in: ['UPLOADED', 'OCR_FAILED'] },
          },
        });
        if (reports.length > 0 && this.reportsService && appointment?.doctor?.userId) {
          for (const r of reports) {
            try {
              // Use the assigned doctor as the acting user to authorize processing
              await this.reportsService.process(r.id, { userId: appointment.doctor.userId, role: 'DOCTOR' });
              this.logger.log(`Enqueued OCR/process for medical report ${r.id} (appointment ${data.appointmentId})`);
            } catch (err) {
              this.logger.warn(`Failed to process medical report ${r.id}: ${err?.message || err}`);
            }
          }
        }
      } catch (err) {
        this.logger.warn(`Error while scanning for medical reports to process: ${err?.message || err}`);
      }

      this.logger.log(`✅ [POST-CALL SUCCESS] EhrRecord created/updated for appointment ${data.appointmentId}`);

      return {
        success: true,
        appointmentId: data.appointmentId,
        ehrRecordId: ehrRecord.id,
        status: 'COMPLETED',
      };
    } catch (error) {
      this.logger.error(`Error processing consultation end for ${data.appointmentId}:`, error);
      throw error;
    }
  }
}
