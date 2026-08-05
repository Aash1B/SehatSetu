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

  constructor(private readonly mailService: MailService) {
    super();
  }

  async process(job: Job<AppointmentReminderJobData>): Promise<any> {
    this.logger.log(`Processing appointment queue job [${job.name}] (ID: ${job.id})`);

    switch (job.name) {
      case 'send-60min-reminder':
        return this.handlePreSessionEmailReminder(job.data, 60);
      case 'send-40min-reminder':
        return this.handlePreSessionEmailReminder(job.data, 40);
      case 'send-30min-reminder':
        return this.handlePreSessionEmailReminder(job.data, 30);
      case 'send-24h-reminder':
        return this.handle24hReminder(job.data);
      case 'send-follow-up-email-reminder':
        return this.handleFollowUpEmailReminder(job.data);
      default:
        this.logger.warn(`Unknown job name in appointment queue: ${job.name}`);
        return { status: 'ignored' };
    }
  }

  private async handlePreSessionEmailReminder(data: AppointmentReminderJobData, minutes: number) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: data.appointmentId },
      include: { patient: { include: { user: true } }, doctor: { include: { user: true } } },
    });

    if (!appointment || ['CANCELLED', 'COMPLETED'].includes(appointment.status)) {
      this.logger.log(`Skipping ${minutes}-min reminder for appointment ${data.appointmentId} (status: ${appointment?.status || 'NOT_FOUND'})`);
      return { status: 'skipped', reason: 'Appointment is completed, cancelled or deleted' };
    }

    const recipient = appointment.patient?.user?.email || appointment.patientEmail;
    if (!recipient) {
      this.logger.warn(`No recipient email found for appointment ${data.appointmentId}`);
      return { status: 'skipped', reason: 'Patient email unavailable' };
    }

    const patientName = appointment.patient?.user?.fullName || appointment.patientName || 'Patient';
    const doctorName = appointment.doctor?.name || appointment.doctor?.user?.fullName || 'your doctor';
    const scheduledText = appointment.scheduledAt
      ? new Date(appointment.scheduledAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })
      : `${appointment.date} ${appointment.timeSlot}`;

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${baseUrl}/patient/consultation/${appointment.id}`;

    const subject = `⏰ Reminder: Your SehatSetu Consultation with ${doctorName} starts in ${minutes} minutes!`;

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #172033; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; padding-bottom: 16px; border-bottom: 2px solid #F0541E;">
          <h2 style="color: #223382; margin: 0; font-size: 24px;">Sehat<span style="color: #F0541E;">Setu</span></h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 14px;">Telehealth Consultation Reminder</p>
        </div>
        
        <div style="padding: 24px 0;">
          <p style="font-size: 16px; margin-top: 0;">Hello <strong>${patientName}</strong>,</p>
          <p style="font-size: 15px;">Your scheduled <strong>${appointment.consultMode || 'Video'} consultation</strong> is starting in <span style="color: #F0541E; font-weight: bold;">${minutes} minutes</span>!</p>
          
          <div style="background-color: #f8fafc; padding: 18px; border-radius: 12px; border-left: 4px solid #223382; margin: 20px 0;">
            <p style="margin: 6px 0;"><strong>Doctor:</strong> ${doctorName}</p>
            <p style="margin: 6px 0;"><strong>Scheduled Time:</strong> ${scheduledText}</p>
            <p style="margin: 6px 0;"><strong>Health Concern:</strong> ${appointment.healthConcern || 'General Medical Consultation'}</p>
          </div>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${joinUrl}" style="background-color: #F0541E; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(240, 84, 30, 0.3);">
              🎥 Join Video Consultation Now
            </a>
          </div>

          <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 14px; border-radius: 8px; text-align: center;">
            <p style="font-size: 13px; color: #1e40af; margin: 0;">
              <strong>Direct Meeting Link:</strong><br/>
              <a href="${joinUrl}" style="color: #2563eb; word-break: break-all;">${joinUrl}</a>
            </p>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
          <p style="margin: 4px 0;">Please ensure camera and microphone permissions are granted before joining.</p>
          <p style="margin: 4px 0;">© SehatSetu Digital Telehealth Platform.</p>
        </div>
      </div>
    `;

    await this.mailService.sendMail(recipient, subject, html);
    this.logger.log(`✅ [PRE-SESSION EMAIL SENT] Sent ${minutes}-min reminder email with join link to ${recipient} (Appointment: ${appointment.id})`);

    return {
      success: true,
      appointmentId: appointment.id,
      reminderType: `${minutes}min`,
      recipient,
      joinUrl,
      sentAt: new Date().toISOString(),
    };
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
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const joinUrl = `${baseUrl}/patient/consultation/${appointment.id}`;

    await this.mailService.sendMail(recipient, `Follow-up consultation reminder: ${scheduledText}`, `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background-color:#ffffff;">
        <h2 style="color:#223382;margin:0 0 16px 0;">SehatSetu Follow-up Reminder</h2>
        <p>Hello ${patientName},</p>
        <p>This is your ${data.reminderLabel || 'scheduled'} reminder for your upcoming follow-up consultation with <strong>${doctorName}</strong>.</p>
        <p><strong>Date and time:</strong> ${scheduledText}<br/><strong>Mode:</strong> ${appointment.consultMode || 'Video consultation'}</p>
        <div style="text-align: center; margin: 24px 0;">
          <a href="${joinUrl}" style="background-color: #F0541E; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block;">
            🎥 Join Consultation Room
          </a>
        </div>
      </div>
    `);
    this.logger.log(`Follow-up reminder sent appointment=${appointment.id} recipient=${recipient} reminder=${data.reminderType}`);
    return { success: true, appointmentId: appointment.id, reminderType: data.reminderType, sentAt: new Date().toISOString() };
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
