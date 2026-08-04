import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter() {
    if (!this.transporter && process.env.SMTP_EMAIL && process.env.SMTP_PASS) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASS,
        },
      });
    }
    return this.transporter;
  }

  async sendMail(to: string, subject: string, html: string) {
    const transporter = this.getTransporter();

    if (!transporter) {
      this.logger.warn(`[DEV MAIL] SMTP credentials (SMTP_EMAIL / SMTP_PASS) not configured. Suppressing SMTP send.`);
      this.logger.log(`[DEV MAIL LOG] To: ${to} | Subject: ${subject}`);
      this.logger.log(`[DEV MAIL CONTENT]:\n${html}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: `"SehatSetu" <${process.env.SMTP_EMAIL}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email successfully sent to ${to}`);
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${to}: ${err?.message || err}`);
      this.logger.log(`[DEV MAIL FALLBACK LOG] To: ${to} | Subject: ${subject}`);
      this.logger.log(`[DEV MAIL CONTENT]:\n${html}`);
    }
  }
}