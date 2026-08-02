import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface AppointmentReminderJobData {
  appointmentId: string;
  patientId?: string;
  doctorId: string;
  patientName?: string;
  scheduledAt?: string;
  consultMode?: string;
  reminderType: '40min' | '30min' | '24h';
}

@Processor('appointment-queue')
@Injectable()
export class AppointmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentProcessor.name);

  async process(job: Job<AppointmentReminderJobData>): Promise<any> {
    this.logger.log(`Processing appointment queue job [${job.name}] (ID: ${job.id})`);
    
    switch (job.name) {
      case 'send-40min-reminder':
        return this.handle40MinReminder(job.data);
      case 'send-30min-reminder':
        return this.handle30MinReminder(job.data);
      case 'send-24h-reminder':
        return this.handle24hReminder(job.data);
      default:
        this.logger.warn(`Unknown job name in appointment queue: ${job.name}`);
        return { status: 'ignored' };
    }
  }

  private async handle40MinReminder(data: AppointmentReminderJobData) {
    this.logger.log(
      `🔔 [40-MIN REMINDER ALERT] Consultation for appointment ${data.appointmentId} starts in 40 minutes! ` +
      `Sending pre-session alert to patient (${data.patientName || 'Patient'}) and doctor (${data.doctorId}).`
    );

    return {
      success: true,
      appointmentId: data.appointmentId,
      reminderType: '40min',
      triggeredAt: new Date().toISOString(),
      recipientNotification: `Reminder: Your SehatSetu consultation with Dr. ${data.doctorId} starts in 40 minutes.`,
    };
  }

  private async handle30MinReminder(data: AppointmentReminderJobData) {
    this.logger.log(
      `🔔 [30-MIN REMINDER ALERT] Appointment ${data.appointmentId} starts in 30 minutes! ` +
      `Notifying patient (${data.patientName || 'Patient'}) and doctor (${data.doctorId}).`
    );

    return {
      success: true,
      appointmentId: data.appointmentId,
      reminderType: '30min',
      triggeredAt: new Date().toISOString(),
      recipientNotification: `Your appointment with Dr. ${data.doctorId} starts in 30 minutes.`,
    };
  }

  private async handle24hReminder(data: AppointmentReminderJobData) {
    this.logger.log(
      `📅 [24-HOUR REMINDER ALERT] Appointment ${data.appointmentId} is scheduled for tomorrow! ` +
      `Notifying patient (${data.patientName || 'Patient'}).`
    );

    return {
      success: true,
      appointmentId: data.appointmentId,
      reminderType: '24h',
      triggeredAt: new Date().toISOString(),
    };
  }
}
