import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReminderStatus } from '@prisma/client';
import { MailService } from '../mail/mail.service';
import { prisma } from '../prisma';

export interface MchReminderJobData {
  reminderId: string;
  type: string;
  patientId: string;
  childId?: string;
}

@Processor('mch-queue')
@Injectable()
export class MchProcessor extends WorkerHost {
  private readonly logger = new Logger(MchProcessor.name);

  constructor(private readonly mail: MailService) {
    super();
  }

  async process(job: Job<MchReminderJobData>): Promise<any> {
    if (job.name === 'send-mch-reminder') {
      return this.handleMchReminder(job.data);
    }
    this.logger.warn(`Unknown MCH job: ${job.name}`);
    return { status: 'ignored' };
  }

  private async handleMchReminder(data: MchReminderJobData) {
    const reminder = await prisma.mchReminder.findUnique({
      where: { id: data.reminderId },
      include: {
        patient: { include: { user: { select: { email: true, fullName: true } } } },
        child: { select: { name: true } },
      },
    });

    if (!reminder) {
      this.logger.warn(`MCH reminder ${data.reminderId} not found — skipping`);
      return { status: 'skipped', reason: 'Reminder not found' };
    }
    if (reminder.status === ReminderStatus.SENT) {
      this.logger.log(`MCH reminder ${data.reminderId} already sent — idempotent skip`);
      return { status: 'skipped', reason: 'Already sent' };
    }

    const recipientEmail = reminder.patient.user?.email;
    const patientName = reminder.patient.user?.fullName || 'Patient';
    if (!recipientEmail) {
      await prisma.mchReminder.update({ where: { id: reminder.id }, data: { status: ReminderStatus.FAILED } });
      return { status: 'failed', reason: 'No email address' };
    }

    const { subject, html } = this.buildReminderEmail(reminder, patientName);

    try {
      await this.mail.sendMail(recipientEmail, subject, html);
      await prisma.mchReminder.update({
        where: { id: reminder.id },
        data: { status: ReminderStatus.SENT, sentAt: new Date() },
      });
      this.logger.log(`✅ MCH reminder sent [${reminder.reminderType}] → ${recipientEmail}`);
      return { status: 'sent', reminderId: reminder.id };
    } catch (err) {
      await prisma.mchReminder.update({ where: { id: reminder.id }, data: { status: ReminderStatus.FAILED } });
      throw err;
    }
  }

  private buildReminderEmail(reminder: any, patientName: string): { subject: string; html: string } {
    const childName = reminder.child?.name;
    const type: string = reminder.reminderType;
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const mchUrl = `${baseUrl}/patient/mch`;

    const isVaccination = type.startsWith('VACCINATION');
    const isAnc = type.startsWith('ANC');

    let timing = '';
    if (type.endsWith('OVERDUE')) timing = 'is overdue';
    else if (type.endsWith('7D')) timing = 'in 7 days';
    else if (type.endsWith('3D')) timing = 'in 3 days';
    else if (type.endsWith('DUE')) timing = 'today';

    const subject = isVaccination
      ? `💉 Vaccination Reminder${childName ? ` for ${childName}` : ''} — due ${timing}`
      : `🏥 ANC Appointment Reminder — due ${timing}`;

    const eventDate = new Date(reminder.eventDate).toLocaleDateString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric',
    });

    const html = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:16px;background:#fff;">
  <div style="text-align:center;padding-bottom:16px;border-bottom:2px solid #F0541E;">
    <h2 style="color:#223382;margin:0;">Sehat<span style="color:#F0541E;">Setu</span></h2>
    <p style="color:#64748b;margin:4px 0 0;font-size:14px;">Maternal &amp; Child Health Reminder</p>
  </div>
  <div style="padding:24px 0;">
    <p style="font-size:16px;margin-top:0;">Hello <strong>${patientName}</strong>,</p>
    ${isVaccination ? `
    <p>This is a reminder that <strong>${childName ? `${childName}'s` : 'a'} vaccination</strong> is scheduled <strong>${timing}</strong> on <strong>${eventDate}</strong>.</p>
    <div style="background:#f8fafc;padding:18px;border-radius:12px;border-left:4px solid #10b981;margin:20px 0;">
      <p style="margin:6px 0;"><strong>Child:</strong> ${childName || 'Your child'}</p>
      <p style="margin:6px 0;"><strong>Scheduled:</strong> ${eventDate}</p>
    </div>
    <p style="font-size:14px;color:#64748b;">Please visit your nearest health centre or your registered paediatrician for the vaccination.</p>
    ` : `
    <p>This is a reminder that your <strong>ANC (Antenatal Care) appointment</strong> is scheduled <strong>${timing}</strong> on <strong>${eventDate}</strong>.</p>
    <div style="background:#f8fafc;padding:18px;border-radius:12px;border-left:4px solid #223382;margin:20px 0;">
      <p style="margin:6px 0;"><strong>Scheduled:</strong> ${eventDate}</p>
    </div>
    <p style="font-size:14px;color:#64748b;">Please contact your doctor if you need to reschedule.</p>
    `}
    <div style="text-align:center;margin:32px 0;">
      <a href="${mchUrl}" style="background:#F0541E;color:#fff;padding:14px 32px;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;display:inline-block;">
        View MCH Dashboard
      </a>
    </div>
  </div>
  <div style="border-top:1px solid #e2e8f0;padding-top:16px;font-size:12px;color:#94a3b8;text-align:center;">
    <p style="margin:4px 0;">This is an automated reminder from SehatSetu MCH Tracking.</p>
    <p style="margin:4px 0;">© SehatSetu Digital Health Platform.</p>
  </div>
</div>`;

    return { subject, html };
  }
}
