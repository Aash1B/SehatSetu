import { Injectable, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectQueue('appointment-queue') private readonly appointmentQueue: Queue,
  ) {}

  async createAppointment(data: any) {
    const doctorId = data.doctorId || 'd1';

    return await prisma.$transaction(async (tx) => {
      // 1. Verify/find or auto-create doctor
      let doctor = await tx.doctor.findUnique({ where: { id: doctorId } });
      if (!doctor) {
        let doctorUser = await tx.user.findFirst({ where: { role: Role.DOCTOR } });
        if (!doctorUser) {
          const passwordHash = await bcrypt.hash('dummy_password', 10);
          doctorUser = await tx.user.create({
            data: {
              email: `doctor-${uuidv4()}@sehatsetu.invalid`,
              fullName: 'Dr. Sarah Jenkins',
              passwordHash,
              role: Role.DOCTOR,
            },
          });
        }
        doctor = await tx.doctor.create({
          data: {
            id: doctorId,
            userId: doctorUser.id,
            specialty: 'Cardiologist',
            consultationFee: 1000,
          },
        });
      }

      // 2. Create or reuse User (Patient)
      let email = data.patientEmail;
      let user: any = null;

      if (email) {
        user = await tx.user.findUnique({ where: { email } });
      }

      if (!user) {
        const passwordHash = await bcrypt.hash('dummy_password', 10);
        if (!email) {
          email = `patient-${uuidv4()}@sehatsetu.invalid`;
        }

        user = await tx.user.create({
          data: {
            email,
            fullName: data.patientName || 'Unknown Patient',
            passwordHash,
            role: Role.PATIENT,
          },
        });
      }

      // 3. Create or reuse Patient record
      let patient = await tx.patient.findUnique({ where: { userId: user.id } });
      if (!patient) {
        patient = await tx.patient.create({
          data: {
            userId: user.id,
            gender: data.patientGender || null,
            allergies: [],
            chronicConditions: [],
          },
        });
      }

      // 4. Safely convert date + time slot into scheduledAt
      let scheduledAt = new Date();
      if (data.date) {
        if (typeof data.date === 'string') {
          const lowerDate = data.date.toLowerCase();
          const targetDate = new Date();
          if (lowerDate.includes('tomorrow')) {
            targetDate.setDate(targetDate.getDate() + 1);
            scheduledAt = targetDate;
          } else if (lowerDate.includes('today')) {
            scheduledAt = targetDate;
          } else {
            const parsed = Date.parse(data.date);
            if (!isNaN(parsed)) {
              scheduledAt = new Date(parsed);
            }
          }
        }
      }

      if (data.timeSlot && typeof data.timeSlot === 'string') {
        const timeParts = data.timeSlot.match(/(\d+):?(\d*)\s*(AM|PM)/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1], 10);
          const minutes = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
          const ampm = timeParts[3].toUpperCase();
          if (ampm === 'PM' && hours < 12) hours += 12;
          if (ampm === 'AM' && hours === 12) hours = 0;

          scheduledAt.setHours(hours, minutes, 0, 0);
        }
      }

      // 5. Create Appointment in DB
      const appointment = await tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          scheduledAt: scheduledAt,
          status: 'SCHEDULED',
          patientName: data.patientName || user.fullName || 'Patient',
          patientAge: data.patientAge ? String(data.patientAge) : null,
          patientGender: data.patientGender || null,
          patientHeight: data.patientHeight ? String(data.patientHeight) : null,
          patientWeight: data.patientWeight ? String(data.patientWeight) : null,
          patientBloodGroup: data.patientBloodGroup || null,
          patientPhone: data.patientPhone || null,
          patientEmail: data.patientEmail || user.email,
          healthConcern: data.healthConcern || null,
          symptoms: Array.isArray(data.symptoms) ? data.symptoms : [],
          duration: data.duration || null,
          severity: data.severity || null,
          consultMode: data.consultMode || 'VIDEO',
          urgency: data.urgency || 'ROUTINE',
          notes: data.notes || null,
          date: data.date || scheduledAt.toISOString().split('T')[0],
          timeSlot: data.timeSlot || '10:00 AM',
          priority: 'ROUTINE',
        },
      });

      // 6. Store extra info in EhrRecord
      const notesStr = [
        data.healthConcern ? `Concern: ${data.healthConcern}` : '',
        data.symptoms && Array.isArray(data.symptoms) && data.symptoms.length ? `Symptoms: ${data.symptoms.join(', ')}` : '',
        data.duration ? `Duration: ${data.duration}` : '',
        data.severity ? `Severity: ${data.severity}` : '',
        data.notes ? `Notes: ${data.notes}` : '',
      ].filter(Boolean).join('\n');

      if (notesStr) {
        await tx.ehrRecord.create({
          data: {
            patientId: patient.id,
            appointmentId: appointment.id,
            notes: notesStr,
          },
        });
      }

      return appointment;
    }).then(async (createdAppt) => {
      // Enqueue 40-min and 30-min pre-appointment delayed reminders in BullMQ
      try {
        const scheduledTimeMs = createdAppt.scheduledAt ? new Date(createdAppt.scheduledAt).getTime() : Date.now();
        const nowMs = Date.now();

        // 40-minute pre-consultation reminder
        const reminder40minMs = scheduledTimeMs - (40 * 60 * 1000);
        const delay40min = Math.max(0, reminder40minMs - nowMs);

        await this.appointmentQueue.add(
          'send-40min-reminder',
          {
            appointmentId: createdAppt.id,
            patientId: createdAppt.patientId || '',
            doctorId: createdAppt.doctorId || 'd1',
            patientName: createdAppt.patientName || 'Patient',
            scheduledAt: createdAppt.scheduledAt ? createdAppt.scheduledAt.toISOString() : new Date().toISOString(),
            consultMode: createdAppt.consultMode || 'VIDEO',
            reminderType: '40min',
          },
          { delay: delay40min }
        );

        // 30-minute pre-consultation reminder
        const reminder30minMs = scheduledTimeMs - (30 * 60 * 1000);
        const delay30min = Math.max(0, reminder30minMs - nowMs);

        await this.appointmentQueue.add(
          'send-30min-reminder',
          {
            appointmentId: createdAppt.id,
            patientId: createdAppt.patientId || '',
            doctorId: createdAppt.doctorId || 'd1',
            patientName: createdAppt.patientName || 'Patient',
            scheduledAt: createdAppt.scheduledAt ? createdAppt.scheduledAt.toISOString() : new Date().toISOString(),
            consultMode: createdAppt.consultMode || 'VIDEO',
            reminderType: '30min',
          },
          { delay: delay30min }
        );

        console.log(`[BullMQ] Enqueued 40-min (Delay: ${delay40min}ms) & 30-min (Delay: ${delay30min}ms) reminders for appointment ${createdAppt.id}`);
      } catch (err: any) {
        console.warn('[BullMQ Warning] Could not enqueue reminder jobs:', err?.message || err);
      }

      return createdAppt;
    }).catch((error) => {
      console.error('Error booking appointment in transaction:', error);
      throw new InternalServerErrorException('Failed to book appointment');
    });
  }

  async getAllAppointments() {
    return prisma.appointment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { doctor: true, patient: true },
    });
  }

  async getAppointmentsForDoctor(doctorId: string) {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          include: {
            user: true
          }
        },
        ehrRecord: true,
      },
    });

    return appointments.map(app => {
      const dateObj = app.scheduledAt ? new Date(app.scheduledAt) : new Date();
      let hours = dateObj.getHours();
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const timeSlotStr = app.timeSlot || `${hours}:${minutes} ${ampm}`;

      return {
        ...app,
        patientName: app.patientName || app.patient?.user?.fullName || 'Patient',
        patientGender: app.patientGender || app.patient?.gender || 'Female',
        patientPhone: app.patientPhone || '',
        patientEmail: app.patientEmail || app.patient?.user?.email || '',
        notes: app.notes || app.ehrRecord?.notes || '',
        status: app.status || 'SCHEDULED',
        date: app.date || dateObj.toISOString().split('T')[0],
        timeSlot: timeSlotStr,
        priority: app.priority || 'ROUTINE',
        healthConcern: app.healthConcern || 'General Consultation',
        symptoms: app.symptoms || []
      };
    });
  }
}
