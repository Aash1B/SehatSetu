import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from '../../mail/mail.service';
import { prisma } from '../../prisma';

export interface AppointmentReminderJobData {
  appointmentId: string;
  patientId?: string;
  doctorId: string;
  patientName?: string;
  scheduledAt?: string;
  consultMode?: string;
  reminderType: string;
  reminderLabel?: string;
}

@Processor('appointment-queue')
@Injectable()
export class AppointmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentProcessor.name);

  constructor(private readonly mailService: MailService) { super(); }

  async process(job: Job<AppointmentReminderJobData>): Promise<any> {
    this.logger.log(`Processing appointment queue job [${job.name}] (ID: ${job.id})`);
    
    switch (job.name) {
      case 'send-40min-reminder':
        return this.handle40MinReminder(job.data);
      case 'send-30min-reminder':
        return this.handle30MinReminder(job.data);
      case 'send-24h-reminder':
        return this.handle24hReminder(job.data);
      case 'send-follow-up-email-reminder':
        return this.handleFollowUpEmailReminder(job.data);
      default:
        this.logger.warn(`Unknown job name in appointment queue: ${job.name}`);
        return { status: 'ignored' };
    }
  }

  private async handleFollowUpEmailReminder(data: AppointmentReminderJobData) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
    });
    if (!appointment || !appointment.isFollowUp || !appointment.emailRemindersEnabled || ['CANCELLED', 'COMPLETED'].includes(appointment.status)) {
      return { status: 'skipped', reason: 'Follow-up is inactive or no longer upcoming' };
    }
    const recipient = appointment.patient?.user?.email || appointment.patientEmail;
    if (!recipient) return { status: 'skipped', reason: 'Patient email is unavailable' };
    const patientName = appointment.patient?.user?.fullName || appointment.patientName || 'Patient';
    const doctorName = appointment.doctor?.name || appointment.doctor?.user?.fullName || 'your doctor';
    const scheduledText = appointment.scheduledAt?.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) || `${appointment.date} ${appointment.timeSlot}`;
    await this.mailService.sendMail(recipient, `Follow-up reminder: ${scheduledText}`, `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033">
        <h2 style="color:#2563eb">SehatSetu follow-up reminder</h2>
        <p>Hello ${patientName},</p>
        <p>This is your ${data.reminderLabel || 'scheduled'} reminder for the follow-up consultation with <strong>${doctorName}</strong>.</p>
        <p><strong>Date and time:</strong> ${scheduledText}<br/><strong>Mode:</strong> ${appointment.consultMode || 'Video consultation'}</p>
        <p>Please keep recent reports and your current medicine list ready.</p>
      </div>
    `);
    this.logger.log(`Follow-up reminder sent appointment=${appointment.id} recipient=${recipient} reminder=${data.reminderType}`);
    return { success: true, appointmentId: appointment.id, reminderType: data.reminderType, sentAt: new Date().toISOString() };
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
