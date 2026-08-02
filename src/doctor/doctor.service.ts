import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

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
    try {
      const doctor = await prisma.doctor.findUnique({
        where: { id: doctorId },
      });
      if (doctor && doctor.availability) {
        return doctor.availability;
      }
    } catch (e) {
      console.warn('Doctor not found in DB, using fallback availability structure:', doctorId);
    }

    return {
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

    return this.updateProfile(doctorId, {
      ...onboardingPayload,
      availability: availabilityData
    });
  }
}
