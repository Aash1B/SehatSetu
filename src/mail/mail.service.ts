import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { BrevoClient } from '@getbrevo/brevo';

export interface AdminVerificationEmailData {
  doctorName: string;
  email: string;
  phone: string;
  specialization: string;
  medicalLicenseNumber: string;
  clinicName: string;
  hospital: string;
  city: string;
  documents: { name: string; type: string; url: string }[];
  token: string;
  submittedAt: Date;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private brevoClient?: BrevoClient;

  private getBrevoClient(): BrevoClient {
    if (this.brevoClient) {
      return this.brevoClient;
    }

    const apiKey = process.env.BREVO_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'Email service is not configured. Set BREVO_API_KEY.',
      );
    }

    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
    if (!senderEmail) {
      throw new ServiceUnavailableException(
        'Email service is not configured. Set BREVO_SENDER_EMAIL.',
      );
    }

    this.brevoClient = new BrevoClient({ apiKey });
    return this.brevoClient;
  }

  async sendMail(to: string, subject: string, html: string): Promise<void> {
    const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
    const senderName = (process.env.BREVO_SENDER_NAME || 'SehatSetu Medical Board').trim();

    if (!senderEmail) {
      this.logger.error('BREVO_SENDER_EMAIL is not configured');
      throw new ServiceUnavailableException('Email service is unavailable. Please try again later.');
    }

    try {
      const client = this.getBrevoClient();
      await client.transactionalEmails.sendTransacEmail({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      });
      this.logger.log(`Email sent successfully to ${to} via Brevo`);
    } catch (error) {
      // Log the error message without exposing API key or secrets
      const details = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send email to ${to}: ${details}`);
      throw new ServiceUnavailableException('Email service is unavailable. Please try again later.');
    }
  }

  async sendAdminVerificationEmail(data: AdminVerificationEmailData) {
    const adminEmail = process.env.ADMIN_EMAIL || process.env.BREVO_SENDER_EMAIL || 'sehatsetu26@gmail.com';
    const backendUrl = (
      process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost')
        ? process.env.BACKEND_URL
        : (process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === 'production' ? 'https://sehat-setu-api.onrender.com' : (process.env.BACKEND_URL || 'http://localhost:8000')))
    ).replace(/\/+$/, '');

    const approveUrl = `${backendUrl}/api/doctor/approve?token=${data.token}`;
    const rejectUrl = `${backendUrl}/api/doctor/reject?token=${data.token}`;

    const docLinksHtml = data.documents && data.documents.length > 0
      ? data.documents.map(doc => `
          <li style="margin-bottom: 6px;">
            <strong>${doc.name} (${doc.type}):</strong> 
            <a href="${doc.url}" target="_blank" style="color: #2563eb; text-decoration: underline;">View Uploaded Document</a>
          </li>
        `).join('')
      : '<li>No document files attached</li>';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="background-color: #1e293b; color: #ffffff; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">🩺 New Doctor Registration - SehatSetu</h2>
        </div>

        <p style="font-size: 15px; color: #334155;">A new doctor has completed their registration and uploaded verification documents for approval.</p>

        <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <h3 style="margin-top: 0; color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Doctor Profile Details</h3>
          <p style="margin: 6px 0;"><strong>Doctor Name:</strong> ${data.doctorName}</p>
          <p style="margin: 6px 0;"><strong>Email:</strong> ${data.email}</p>
          <p style="margin: 6px 0;"><strong>Phone:</strong> ${data.phone}</p>
          <p style="margin: 6px 0;"><strong>Specialization:</strong> ${data.specialization}</p>
          <p style="margin: 6px 0;"><strong>Medical License No.:</strong> ${data.medicalLicenseNumber}</p>
          <p style="margin: 6px 0;"><strong>Clinic Name:</strong> ${data.clinicName}</p>
          <p style="margin: 6px 0;"><strong>Hospital/Practice:</strong> ${data.hospital || 'N/A'}</p>
          <p style="margin: 6px 0;"><strong>City / Location:</strong> ${data.city}</p>
          <p style="margin: 6px 0;"><strong>Verification Status:</strong> <span style="background-color: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 4px; font-weight: bold;">PENDING</span></p>
          <p style="margin: 6px 0;"><strong>Submission Date:</strong> ${data.submittedAt.toLocaleString()}</p>
        </div>

        <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
          <h3 style="margin-top: 0; color: #0f172a;">📄 Uploaded Verification Documents</h3>
          <ul style="padding-left: 20px; color: #334155; margin-bottom: 0;">
            ${docLinksHtml}
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0 10px 0; display: flex; justify-content: center; gap: 16px;">
          <a href="${approveUrl}" style="background-color: #16a34a; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ✅ Approve Doctor
          </a>
          &nbsp;&nbsp;&nbsp;
          <a href="${rejectUrl}" style="background-color: #dc2626; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            ❌ Reject Doctor
          </a>
        </div>

        <p style="font-size: 12px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
          Note: These approval/rejection links are cryptographically secured and valid for 7 days. Clicking either link will execute the action directly without needing an admin panel.
        </p>
      </div>
    `;

    await this.sendMail(adminEmail, 'New Doctor Registration - SehatSetu', html);
  }

  async sendDoctorApprovalEmail(doctorEmail: string, doctorName: string) {
    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const loginUrl = `${frontendUrl}/doctor/login`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="background-color: #16a34a; color: #ffffff; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">🎉 Your SehatSetu Account Has Been Approved</h2>
        </div>

        <p style="font-size: 16px; color: #0f172a; font-weight: bold;">Congratulations Dr. ${doctorName},</p>
        
        <p style="font-size: 15px; color: #334155; leading-height: 1.6;">
          Your medical credentials and verification documents have been successfully verified by our medical board. You may now log in to access your Doctor Dashboard and begin consultations.
        </p>

        <div style="background-color: #f8fafc; border-left: 4px solid #16a34a; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Login Email:</strong> ${doctorEmail}</p>
          <p style="margin: 4px 0; font-size: 14px; color: #334155;"><strong>Password:</strong> Use the SAME password you created during registration.</p>
        </div>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="background-color: #1e293b; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px; display: inline-block;">
            Doctor Login Portal
          </a>
        </div>

        <p style="font-size: 13px; color: #64748b;">
          If you have forgotten your password, use the <em>Forgot Password</em> feature on the login page.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 13px; color: #64748b; margin: 0;">Regards,<br /><strong>SehatSetu Medical Verification Team</strong></p>
      </div>
    `;

    await this.sendMail(doctorEmail, 'Your SehatSetu Account Has Been Approved', html);
  }

  async sendDoctorRejectionEmail(doctorEmail: string, doctorName: string, reason?: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background-color: #ffffff;">
        <div style="background-color: #dc2626; color: #ffffff; padding: 16px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 20px;">Verification Failed</h2>
        </div>

        <p style="font-size: 16px; color: #0f172a; font-weight: bold;">Dear Dr. ${doctorName},</p>
        
        <p style="font-size: 15px; color: #334155; leading-height: 1.6;">
          We regret to inform you that your doctor registration with SehatSetu could not be approved at this time following document inspection by our medical board.
        </p>

        ${reason ? `
        <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-size: 14px; color: #991b1b;"><strong>Reason:</strong> ${reason}</p>
        </div>
        ` : ''}

        <p style="font-size: 14px; color: #334155; margin-top: 20px;">
          You are welcome to re-register with valid medical registration documents or contact our support team at <a href="mailto:support@sehatsetu.com">support@sehatsetu.com</a> if you believe this is an error.
        </p>

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="font-size: 13px; color: #64748b; margin: 0;">Regards,<br /><strong>SehatSetu Team</strong></p>
      </div>
    `;

    await this.sendMail(doctorEmail, 'Verification Failed', html);
  }
}