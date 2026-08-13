import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { prisma } from '../prisma';

@Injectable()
export class LivekitService {
  constructor(
    @InjectQueue('consultation-queue') private readonly consultationQueue: Queue,
  ) {}

  async createToken(roomName: string, participantName: string): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new InternalServerErrorException('LiveKit credentials are not configured');
    }

    const uniqueIdentity = `${participantName}_${Math.random().toString(36).substring(2, 7)}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: uniqueIdentity,
      name: participantName,
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });
    
    return await at.toJwt();
  }

  async createTokenForAppointment(appointmentId: string, userId: string, role: string): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new InternalServerErrorException('LiveKit credentials are not configured');
    }

    let appointment: any = null;
    try {
      if (appointmentId && appointmentId.trim().length > 0) {
        appointment = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          include: {
            doctor: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } },
            patient: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } },
          },
        });
      }
    } catch (dbErr: any) {
      console.warn(`[LiveKit] Appointment DB lookup warning for ${appointmentId}:`, dbErr?.message || dbErr);
    }

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    const isDoctor = role === 'DOCTOR';
    const isPatient = role === 'PATIENT';

    const expectedUserId = isDoctor ? appointment.doctor?.userId : (isPatient ? appointment.patient?.userId : null);

    if (expectedUserId && expectedUserId !== userId) {
      throw new ForbiddenException('You are not a participant in this appointment');
    }

    const participantName = appointment
      ? (isDoctor
          ? appointment.doctor?.user?.fullName || appointment.doctor?.name || 'Doctor'
          : appointment.patient?.user?.fullName || appointment.patientName || 'Patient')
      : (isDoctor ? 'Doctor' : 'Patient');

    const roomName = `consultation-${appointmentId}`;
    const uniqueIdentity = `${role ? role.toLowerCase() : 'user'}_${userId || 'guest'}_${Math.random().toString(36).substring(2, 7)}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: uniqueIdentity,
      name: participantName,
      ttl: '2h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return await at.toJwt();
  }

  async enqueueConsultationEnd(appointmentId: string, notes?: string, durationSeconds?: number) {
    try {
      const job = await this.consultationQueue.add('process-consultation-end', {
        appointmentId,
        notes,
        durationSeconds: durationSeconds || 900,
      });

      console.log(`[BullMQ] Enqueued post-consultation job for appointment ${appointmentId} (Job ID: ${job.id})`);

      return {
        success: true,
        message: `Consultation end job enqueued for background AI summary processing.`,
        jobId: job.id,
      };
    } catch (error: any) {
      console.warn('[BullMQ Warning] Could not enqueue consultation end job:', error?.message || error);
      return {
        success: false,
        message: 'Could not enqueue background job (Redis offline or unavailable).',
      };
    }
  }

  async endConsultation(
    appointmentId: string,
    userId: string,
    role: string,
    notes?: string,
    durationSeconds?: number,
    prescription?: any,
  ) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { doctor: true, patient: true },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    const isDoctor = role === 'DOCTOR' && appointment.doctor?.userId === userId;
    const isPatient = role === 'PATIENT' && appointment.patient?.userId === userId;
    if (!isDoctor && !isPatient) throw new ForbiddenException('You cannot end this consultation');

    let savedPrescription: any = null;
    const normalizedPrescriptionSymptoms: string[] = Array.isArray(prescription?.symptoms)
      ? Array.from(new Set(
        (prescription.symptoms as unknown[])
          .filter((symptom): symptom is string => typeof symptom === 'string')
          .map((symptom) => symptom.trim())
          .filter((symptom) => symptom.length > 0),
      ))
      : [];
    if (prescription) {
      if (!isDoctor || !appointment.patientId) {
        throw new ForbiddenException('Only the assigned doctor can issue a prescription');
      }
      const prescriptionDiagnosis = typeof prescription.diagnosis === 'string'
        ? prescription.diagnosis.trim()
        : '';
      const diagnosis = prescriptionDiagnosis || appointment.healthConcern || null;
      savedPrescription = await prisma.prescription.upsert({
        where: { appointmentId },
        create: {
          appointmentId,
          patientId: appointment.patientId,
          doctorId: appointment.doctorId,
          medicines: Array.isArray(prescription.medications) ? prescription.medications : [],
          diagnosis,
          dietAdvice: prescription.dietAdvice || null,
        },
        update: {
          medicines: Array.isArray(prescription.medications) ? prescription.medications : [],
          diagnosis,
          dietAdvice: prescription.dietAdvice || null,
        },
      });
      await prisma.ehrRecord.upsert({
        where: { appointmentId },
        create: { appointmentId, patientId: appointment.patientId, diagnosis: prescription.diagnosis || appointment.healthConcern, notes: prescription.notes || notes },
        update: { diagnosis: prescription.diagnosis || appointment.healthConcern, notes: prescription.notes || notes },
      });
    }
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: 'COMPLETED',
        ...(prescription ? { symptoms: normalizedPrescriptionSymptoms } : {}),
      },
    });
    const queueResult = await this.enqueueConsultationEnd(appointmentId, notes, durationSeconds);
    return { ...queueResult, prescription: savedPrescription };
  }
}
