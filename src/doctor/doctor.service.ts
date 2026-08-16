import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from '../prisma';
import { MailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface DocumentUploadResult {
  id: string;
  name: string;
  documentType: string; // ✅ FIX ADDED
  type: string;
  status: 'Verified' | 'Pending' | 'Rejected';
  uploadDate: string;
  storageBucket: string;
  storagePath: string;
  publicUrl: string;
  fileSizeBytes: number;
}
@Injectable()
export class DoctorService {
  constructor(private readonly mailService: MailService) { }

  /**
   * Uploads doctor profile image to Supabase Storage Bucket 'doctor-profile-images'
   */
  async uploadProfileImageToSupabase(
    file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number } | any,
    userId: string,
  ): Promise<{ imageUrl: string; imageStoragePath: string }> {
    if (!file || !file.buffer) {
      throw new BadRequestException('Profile image file is required');
    }
    if (file.size && file.size > 5 * 1024 * 1024) {
      throw new BadRequestException('Profile image size must not exceed 5MB');
    }
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (file.mimetype && !allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP image formats are allowed');
    }

    const doctor = await prisma.doctor.findFirst({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found for user');

    const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '') || 'https://jxsfimnztuoorcpttikz.supabase.co';
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const bucket = 'doctor-profile-images';
    const storagePath = `doctors/${doctor.id}/profile.webp`;
    const publicUrl = `${projectUrl}/storage/v1/object/public/${bucket}/${storagePath}`;

    if (secretKey && !secretKey.includes('placeholder')) {
      try {
        const uploadUrl = `${projectUrl}/storage/v1/object/${bucket}/${storagePath}`;
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'image/webp',
            'x-upsert': 'true',
          },
          body: file.buffer as unknown as BodyInit,
        });

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`Supabase profile image upload non-200 (${response.status}):`, errText);
        } else {
          console.log(`Successfully stored profile image in [${bucket}]: ${storagePath}`);
        }
      } catch (error) {
        console.error('Error uploading profile image to Supabase:', error);
      }
    }

    await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        imageUrl: publicUrl,
        imageStoragePath: storagePath,
      },
    });

    return { imageUrl: publicUrl, imageStoragePath: storagePath };
  }

  /**
   * Uploads doctor verification document to local storage and Supabase Storage Bucket
   */
  async uploadDocumentToSupabase(
    file: { buffer: Buffer; originalname?: string; mimetype?: string; size?: number } | any,
    documentType: string,
    doctorId: string,
  ): Promise<DocumentUploadResult> {
    const projectUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '') || 'https://jxsfimnztuoorcpttikz.supabase.co';
    const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'medical-reports';

    const cleanDocType = documentType.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const fileExt = file.originalname?.split('.').pop() || 'pdf';
    const safeDocId = (doctorId || 'd1').replace(/[^a-zA-Z0-9_-]/g, '');
    const filename = `${safeDocId}-${cleanDocType}-${Date.now()}.${fileExt}`;
    const storagePath = `doctor-documents/${safeDocId}/${filename}`;
    
    const backendUrl = (
      process.env.BACKEND_URL && !process.env.BACKEND_URL.includes('localhost')
        ? process.env.BACKEND_URL
        : (process.env.RENDER_EXTERNAL_URL || (process.env.NODE_ENV === 'production' ? 'https://sehat-setu-api.onrender.com' : (process.env.BACKEND_URL || 'http://localhost:8000')))
    ).replace(/\/+$/, '');
    const localDocUrl = `${backendUrl}/api/doctor/documents/file/${filename}`;
    let publicUrl = localDocUrl;

    // Save copy of document buffer to local filesystem as fallback
    try {
      const uploadDir = path.join(process.cwd(), 'uploads', 'doctor-documents');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), file.buffer);
      console.log(`Saved doctor verification document locally: uploads/doctor-documents/${filename}`);
    } catch (fsErr) {
      console.error('Failed to save document locally:', fsErr);
    }

    // Attempt direct upload to Supabase Storage REST API
    if (secretKey && !secretKey.includes('placeholder')) {
      try {
        const uploadUrl = `${projectUrl}/storage/v1/object/${bucket}/${storagePath}`;
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            apikey: secretKey,
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': file.mimetype || 'application/pdf',
            'x-upsert': 'true',
          },
          body: file.buffer as unknown as BodyInit,
        });

        if (response.ok) {
          // Generate signed URL valid for 30 days so admin can open the document directly from email
          try {
            const signRes = await fetch(`${projectUrl}/storage/v1/object/sign/${bucket}/${storagePath}`, {
              method: 'POST',
              headers: {
                apikey: secretKey,
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ expiresIn: 60 * 60 * 24 * 30 }),
            });
            if (signRes.ok) {
              const signData = await signRes.json();
              if (signData?.signedURL) {
                publicUrl = `${projectUrl}/storage/v1${signData.signedURL}`;
              }
            }
          } catch (signErr) {
            console.warn('Could not generate signed URL, using direct Supabase path:', signErr);
          }

          if (!publicUrl || publicUrl === localDocUrl) {
            publicUrl = `${projectUrl}/storage/v1/object/public/${bucket}/${storagePath}`;
          }
          console.log(`Successfully stored document in Supabase bucket [${bucket}]: ${storagePath}`);
        } else {
          const errText = await response.text();
          console.warn(`Supabase storage response non-200 (${response.status}): ${errText}. Using backend proxy URL.`);
        }
      } catch (error) {
        console.error('Error during Supabase document upload:', error);
      }
    }

    return {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: file.originalname || `${documentType}.${fileExt}`,
      documentType,
      type: (file.mimetype || 'application/pdf').includes('pdf') ? 'PDF' : 'IMAGE',
      status: 'Verified',
      uploadDate: new Date().toISOString().split('T')[0],
      storageBucket: bucket,
      storagePath,
      publicUrl,
      fileSizeBytes: file.size || file.buffer?.length || 102400,
    };
  }

  async getAvailability(doctorId: string) {
    let resolvedDoctorIds = [doctorId];
    let availability: any = null;
    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
      });
      if (doctor) {
        availability = doctor.availability;
        if (!doctor.userId && doctor.name) {
          const normalizedName = doctor.name.replace(/^dr\.?\s*/i, '').trim().toLowerCase();
          const linkedDoctors = await prisma.doctor.findMany({ where: { userId: { not: '' } }, include: { user: true } });
          const linkedMatch = linkedDoctors.find((candidate) =>
            candidate.user?.fullName.replace(/^dr\.?\s*/i, '').trim().toLowerCase() === normalizedName,
          );
          if (linkedMatch) resolvedDoctorIds.push(linkedMatch.id);
        }
      }
    } catch (e) {
      console.warn('Doctor not found in DB, using fallback availability structure:', doctorId);
    }

    const hasValidSlots = availability && typeof availability === 'object' && Array.isArray(availability.slots) && availability.slots.length > 0;
    const baseAvailability = hasValidSlots ? availability : {
      slotDurationMinutes: 15,
      status: 'Available',
      slots: [
        { day: 'Monday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Tuesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Wednesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Thursday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Friday', isWorking: true, workingHours: '09:00 AM - 01:00 PM', breakTime: 'None' },
        { day: 'Saturday', isWorking: false, workingHours: 'Closed', breakTime: '-' },
        { day: 'Sunday', isWorking: false, workingHours: 'Closed', breakTime: '-' }
      ]
    };
    const allDoctorsInDb = await prisma.doctor.findMany({ select: { id: true } });
    const queryDoctorIds = Array.from(new Set([...resolvedDoctorIds, ...allDoctorsInDb.map((d) => d.id)]));

    const appointments = await prisma.appointment.findMany({
      where: {
        doctorId: { in: queryDoctorIds },
        status: { in: ['PAYMENT_PENDING', 'SCHEDULED', 'WAITING', 'PENDING', 'ACCEPTED', 'CONFIRMED', 'IN_PROGRESS'] },
      },
      select: { scheduledAt: true, timeSlot: true, date: true },
    });
    const bookedSlots: Record<string, string[]> = {};
    appointments.forEach((appointment) => {
      let dateKey = '';
      if (appointment.scheduledAt) {
        const d = new Date(appointment.scheduledAt);
        if (!isNaN(d.getTime())) {
          dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (!dateKey && appointment.date) {
        dateKey = appointment.date;
      }
      if (!dateKey) return;

      const rawSlot = appointment.timeSlot || '';
      let formattedSlot = rawSlot.trim();
      if (appointment.scheduledAt && !formattedSlot) {
        const d = new Date(appointment.scheduledAt);
        if (!isNaN(d.getTime())) {
          let hours = d.getHours();
          const mins = String(d.getMinutes()).padStart(2, '0');
          const ampm = hours >= 12 ? 'PM' : 'AM';
          hours = hours % 12;
          hours = hours ? hours : 12;
          formattedSlot = `${String(hours).padStart(2, '0')}:${mins} ${ampm}`;
        }
      }
      if (formattedSlot) {
        const existing = bookedSlots[dateKey] || [];
        bookedSlots[dateKey] = Array.from(new Set([...existing, formattedSlot]));
      }
    });
    return { ...(baseAvailability as object), bookedSlots };
  }

  async updateAvailability(doctorId: string, availability: any) {
    try {
      const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
      if (doctor) {
        const updated = await prisma.doctor.update({
          where: { id: doctorId },
          data: { availability },
        });
        return updated.availability;
      }
    } catch (err) {
      console.error('Error updating availability in DB:', err);
    }
    return availability;
  }

  async getProfile(doctorId: string) {
    let doctor = await prisma.doctor.findUnique({
      where: { id: doctorId },
      include: {
        user: true,
      },
    });

    if (!doctor && doctorId === 'd1') {
      doctor = await prisma.doctor.findFirst({
        include: { user: true }
      });
    }

    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    return doctor;
  }

  async updateProfile(doctorId: string, profileData: any) {
    let targetId = doctorId;
    let doctor = await prisma.doctor.findFirst({
      where: {
        OR: [
          { id: targetId },
          { userId: targetId },
        ],
      },
    });

    if (doctor) {
      targetId = doctor.id;
    } else if (doctorId === 'd1') {
      const firstDoc = await prisma.doctor.findFirst();
      if (firstDoc) {
        doctor = firstDoc;
        targetId = firstDoc.id;
      }
    }

    const doctorData = { ...profileData };
    let userData: any = null;

    if (doctorData.fullName || doctorData.email) {
      userData = {};
      if (doctorData.fullName) userData.fullName = doctorData.fullName;
      if (doctorData.email) userData.email = doctorData.email;
    }

    // Clean payload for doctor model updates
    const cleanedDoctorData: any = {};
    if (doctorData.fullName || doctorData.name) cleanedDoctorData.name = doctorData.fullName || doctorData.name;
    if (doctorData.specialization || doctorData.specialty) cleanedDoctorData.specialty = doctorData.specialization || doctorData.specialty;
    if (doctorData.yearsOfExperience) cleanedDoctorData.experience = `${doctorData.yearsOfExperience} Years Exp.`;
    if (doctorData.qualification || doctorData.degrees) cleanedDoctorData.degrees = doctorData.qualification || doctorData.degrees;
    if (doctorData.clinicName || doctorData.hospital) cleanedDoctorData.hospital = doctorData.clinicName || doctorData.hospital;
    if (doctorData.address || doctorData.location) cleanedDoctorData.location = doctorData.address || doctorData.location;
    if (doctorData.photoUrl || doctorData.imageUrl) cleanedDoctorData.imageUrl = doctorData.photoUrl || doctorData.imageUrl;
    if (doctorData.consultationFee) {
      cleanedDoctorData.consultationFee = Number(doctorData.consultationFee);
      cleanedDoctorData.fee = `₹${doctorData.consultationFee}`;
    }
    if (doctorData.languagesSpoken) cleanedDoctorData.tags = doctorData.languagesSpoken;
    if (doctorData.availability) cleanedDoctorData.availability = doctorData.availability;
    if (doctorData.profileCompleted !== undefined) cleanedDoctorData.profileCompleted = Boolean(doctorData.profileCompleted);
    cleanedDoctorData.availableToday = true;

    if (doctorData.verificationStatus) cleanedDoctorData.verificationStatus = doctorData.verificationStatus;
    if (doctorData.isVerified !== undefined) cleanedDoctorData.isVerified = Boolean(doctorData.isVerified);
    if (doctorData.approvalToken !== undefined) cleanedDoctorData.approvalToken = doctorData.approvalToken;
    if (doctorData.approvalTokenExpiry !== undefined) cleanedDoctorData.approvalTokenExpiry = doctorData.approvalTokenExpiry;

    if (doctor) {
      return prisma.$transaction(async (tx) => {
        if (userData && Object.keys(userData).length > 0 && doctor.userId) {
          await tx.user.update({
            where: { id: doctor.userId },
            data: userData,
          });
        }
        return tx.doctor.update({
          where: { id: targetId },
          data: cleanedDoctorData,
          include: { user: true }
        });
      });
    } else {
      // Check if targetId is a userId
      const userObj = await prisma.user.findUnique({ where: { id: doctorId } });
      return prisma.doctor.create({
        data: {
          id: targetId,
          userId: userObj ? userObj.id : targetId,
          specialty: cleanedDoctorData.specialty || 'General Physician',
          name: cleanedDoctorData.name || (userObj ? userObj.fullName : 'Dr. New Doctor'),
          experience: cleanedDoctorData.experience || '5+ Years Exp.',
          degrees: cleanedDoctorData.degrees || 'MBBS',
          hospital: cleanedDoctorData.hospital || 'Apollo Medical Center',
          location: cleanedDoctorData.location || 'Mumbai',
          imageUrl: cleanedDoctorData.imageUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
          fee: cleanedDoctorData.fee || '₹500',
          consultationFee: cleanedDoctorData.consultationFee || 500,
          availability: cleanedDoctorData.availability || {},
          availableToday: true,
          tags: cleanedDoctorData.tags || ['English', 'Hindi'],
          verificationStatus: cleanedDoctorData.verificationStatus || 'PENDING',
          isVerified: cleanedDoctorData.isVerified || false,
          approvalToken: cleanedDoctorData.approvalToken,
          approvalTokenExpiry: cleanedDoctorData.approvalTokenExpiry,
        },
        include: { user: true },
      });
    }
  }

  async saveOnboardingProfile(doctorId: string, onboardingPayload: any) {
    const availabilityData = {
      slots: onboardingPayload.availability?.slots || [
        { day: 'Monday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Tuesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Wednesday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Thursday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Friday', isWorking: true, workingHours: '09:00 AM - 05:00 PM', breakTime: '01:00 PM - 02:00 PM' },
        { day: 'Saturday', isWorking: true, workingHours: '10:00 AM - 02:00 PM', breakTime: 'None' },
        { day: 'Sunday', isWorking: false, workingHours: 'Closed', breakTime: 'None' }
      ],
      slotDurationMinutes: onboardingPayload.slotDurationMinutes || 30,
      status: 'Available',
      aboutMe: onboardingPayload.aboutMe,
      medicalLicenseNumber: onboardingPayload.medicalLicenseNumber,
      email: onboardingPayload.email,
      phoneNumber: onboardingPayload.phoneNumber,
      documents: onboardingPayload.documents || []
    };

    const doctor = await prisma.doctor.findFirst({
      where: {
        OR: [{ id: doctorId }, { userId: doctorId }],
      },
    });

    if (!doctor?.imageUrl && !onboardingPayload.photoUrl && !onboardingPayload.imageUrl) {
      throw new BadRequestException('Doctor profile image is required before finishing onboarding');
    }

    // Generate a cryptographically secure approval token (7 days expiry)
    const approvalToken = randomBytes(32).toString('hex');
    const approvalTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const updated = await this.updateProfile(doctorId, {
      ...onboardingPayload,
      availability: availabilityData,
      profileCompleted: true,
      isVerified: false,
      verificationStatus: 'PENDING',
      approvalToken,
      approvalTokenExpiry,
      isActive: true,
    });

    // Dispatch Administrator Email with Approve / Reject action links
    const docName = updated.name || onboardingPayload.fullName || 'Doctor';
    const email = onboardingPayload.email || (updated as any).user?.email || 'N/A';
    const phone = onboardingPayload.phoneNumber || 'N/A';
    const specialization = updated.specialty || onboardingPayload.specialization || 'General Physician';
    const medicalLicenseNumber = onboardingPayload.medicalLicenseNumber || 'N/A';
    const clinicName = onboardingPayload.clinicName || 'N/A';
    const hospital = updated.hospital || onboardingPayload.clinicName || 'N/A';
    const city = updated.location || onboardingPayload.address || 'India';
    const docLabels: Record<string, string> = {
      'medical-license': 'Medical Registration License',
      'degree-certificate': 'Medical Degree Certificate',
      'id-proof': 'Government Photo ID Document',
    };

    const docs = (onboardingPayload.documents || []).map((d: any) => {
      const label = docLabels[d.documentType] || docLabels[d.name] || d.name || 'Verification Document';
      return {
        name: label,
        type: d.type || (d.publicUrl?.endsWith('.pdf') ? 'PDF' : 'Document'),
        url: d.publicUrl || d.url || '#'
      };
    });

    try {
      await this.mailService.sendAdminVerificationEmail({
        doctorName: docName,
        email,
        phone,
        specialization,
        medicalLicenseNumber,
        clinicName,
        hospital,
        city,
        documents: docs,
        token: approvalToken,
        submittedAt: new Date(),
      });
    } catch (mailErr) {
      console.error('Error dispatching admin verification email:', mailErr);
    }

    return updated;
  }

  async approveDoctor(token: string): Promise<string> {
    if (!token) {
      return this.renderHtmlResult('Invalid Request', 'No approval token provided.', false);
    }

    const doctor = await prisma.doctor.findFirst({
      where: { approvalToken: token },
      include: { user: true },
    });

    if (!doctor) {
      return this.renderHtmlResult('Token Invalid or Already Used', 'This approval link is invalid or has already been consumed.', false);
    }

    if (doctor.approvalTokenExpiry && doctor.approvalTokenExpiry < new Date()) {
      return this.renderHtmlResult('Token Expired', 'This approval link has expired (valid for 7 days only). Please re-request verification.', false);
    }

    if (doctor.verificationStatus !== 'PENDING') {
      return this.renderHtmlResult('Action Already Completed', `Doctor Dr. ${doctor.name || ''} is already marked as ${doctor.verificationStatus}.`, false);
    }

    // Approve doctor in database
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        verificationStatus: 'APPROVED',
        isVerified: true,
        approvalToken: null,
        approvalTokenExpiry: null,
      },
    });

    const recipientEmail = doctor.user?.email || (doctor.availability as any)?.email;
    const doctorName = doctor.name || doctor.user?.fullName || 'Doctor';

    if (recipientEmail) {
      try {
        await this.mailService.sendDoctorApprovalEmail(recipientEmail, doctorName);
        console.log(`[MailService] Dispatched Approval Confirmation Email to doctor: ${recipientEmail} ✅`);
      } catch (err) {
        console.error('Failed to send approval email to doctor:', err);
      }
    }

    return this.renderHtmlResult(
      'Doctor Approved Successfully',
      `Dr. ${doctorName} (${recipientEmail || 'Doctor'}) has been successfully approved! An automated confirmation email has been dispatched to ${recipientEmail || 'the doctor'}. They may now log in to the dashboard using their registered email and password.`,
      true,
    );
  }

  async rejectDoctor(token: string, reason?: string): Promise<string> {
    if (!token) {
      return this.renderHtmlResult('Invalid Request', 'No approval token provided.', false);
    }

    const doctor = await prisma.doctor.findFirst({
      where: { approvalToken: token },
      include: { user: true },
    });

    if (!doctor) {
      return this.renderHtmlResult('Token Invalid or Already Used', 'This rejection link is invalid or has already been consumed.', false);
    }

    if (doctor.approvalTokenExpiry && doctor.approvalTokenExpiry < new Date()) {
      return this.renderHtmlResult('Token Expired', 'This link has expired.', false);
    }

    if (doctor.verificationStatus !== 'PENDING') {
      return this.renderHtmlResult('Action Already Completed', `Doctor Dr. ${doctor.name || ''} is already marked as ${doctor.verificationStatus}.`, false);
    }

    const rejectionReason = reason || 'Medical registration documents could not be authenticated by administrator';

    // Reject doctor
    await prisma.doctor.update({
      where: { id: doctor.id },
      data: {
        verificationStatus: 'REJECTED',
        isVerified: false,
        approvalToken: null,
        approvalTokenExpiry: null,
        rejectionReason,
      },
    });

    const recipientEmail = doctor.user?.email || (doctor.availability as any)?.email;
    const doctorName = doctor.name || doctor.user?.fullName || 'Doctor';

    if (recipientEmail) {
      try {
        await this.mailService.sendDoctorRejectionEmail(recipientEmail, doctorName, rejectionReason);
      } catch (err) {
        console.error('Failed to send rejection email to doctor:', err);
      }
    }

    return this.renderHtmlResult(
      'Doctor Registration Rejected',
      `Registration for Dr. ${doctorName} (${recipientEmail || 'Doctor'}) has been rejected. A notification email has been dispatched.`,
      false,
    );
  }

  private renderHtmlResult(title: string, message: string, isSuccess: boolean): string {
    const icon = isSuccess ? '✅' : '❌';
    const bgColor = isSuccess ? '#16a34a' : '#dc2626';
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${title} - SehatSetu</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 40px 16px; display: flex; justify-content: center; align-items: center; min-height: 80vh; }
          .card { background: #ffffff; max-width: 520px; width: 100%; border-radius: 20px; padding: 36px 28px; border: 1px solid #e2e8f0; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05); text-align: center; }
          .icon-header { background: ${bgColor}; color: #ffffff; width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 30px; margin: 0 auto 20px auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          h1 { color: #0f172a; font-size: 22px; margin: 0 0 12px 0; font-weight: 800; }
          p { color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; }
          .footer { font-size: 12px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon-header">${icon}</div>
          <h1>${title}</h1>
          <p>${message}</p>
          <div class="footer">SehatSetu Medical Verification Portal • Administrator System</div>
        </div>
      </body>
      </html>
    `;
  }
}
