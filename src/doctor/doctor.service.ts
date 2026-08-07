import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { prisma } from '../prisma';

export interface DocumentUploadResult {
  id: string;
  name: string;
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
   * Uploads doctor verification document to Supabase Storage Bucket
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
    const storagePath = `doctor-documents/${safeDocId}/${cleanDocType}-${Date.now()}.${fileExt}`;
    const publicUrl = `${projectUrl}/storage/v1/object/public/${bucket}/${storagePath}`;

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

        if (!response.ok) {
          const errText = await response.text();
          console.warn(`Supabase storage response non-200 (${response.status}):`, errText);
        } else {
          console.log(`Successfully stored document in Supabase bucket [${bucket}]: ${storagePath}`);
        }
      } catch (error) {
        console.error('Error during Supabase document upload:', error);
      }
    } else {
      console.log(`Simulated storage upload for bucket [${bucket}]: ${storagePath}`);
    }

    return {
      id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      name: file.originalname || `${documentType}.pdf`,
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
          const linkedDoctors = await prisma.doctor.findMany({ where: { userId: { not: null } }, include: { user: true } });
          const linkedMatch = linkedDoctors.find((candidate) =>
            candidate.user?.fullName.replace(/^dr\.?\s*/i, '').trim().toLowerCase() === normalizedName,
          );
          if (linkedMatch) resolvedDoctorIds.push(linkedMatch.id);
        }
      }
    } catch (e) {
      console.warn('Doctor not found in DB, using fallback availability structure:', doctorId);
    }

    const baseAvailability = availability || {
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
        status: { in: ['SCHEDULED', 'WAITING', 'PENDING', 'ACCEPTED', 'CONFIRMED', 'IN_PROGRESS'] },
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
    let doctor = await prisma.doctor.findUnique({
      where: { id: targetId },
    });

    if (!doctor && doctorId === 'd1') {
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
      // Create new Doctor if not existing
      return prisma.doctor.create({
        data: {
          id: targetId,
          specialty: cleanedDoctorData.specialty || 'General Physician',
          name: cleanedDoctorData.name || 'Dr. New Doctor',
          experience: cleanedDoctorData.experience || '5+ Years Exp.',
          degrees: cleanedDoctorData.degrees || 'MBBS',
          hospital: cleanedDoctorData.hospital || 'Apollo Medical Center',
          location: cleanedDoctorData.location || 'Mumbai',
          imageUrl: cleanedDoctorData.imageUrl || 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400',
          fee: cleanedDoctorData.fee || '₹500',
          consultationFee: cleanedDoctorData.consultationFee || 500,
          availability: cleanedDoctorData.availability || {},
          availableToday: true,
          tags: cleanedDoctorData.tags || ['English', 'Hindi']
        }
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

    const doctor = await prisma.doctor.findFirst({ where: { id: doctorId } });
    if (!doctor?.imageUrl && !onboardingPayload.photoUrl && !onboardingPayload.imageUrl) {
      throw new BadRequestException('Doctor profile image is required before finishing onboarding');
    }

    return this.updateProfile(doctorId, {
      ...onboardingPayload,
      availability: availabilityData,
      profileCompleted: true,
      isVerified: true,
      isActive: true,
    });
  }
}
