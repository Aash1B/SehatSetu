import { Injectable, BadRequestException, ConflictException, HttpException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { prisma } from '../prisma';

import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectQueue('appointment-queue') private readonly appointmentQueue: Queue,
  ) { }

  async createAppointment(data: any, authenticatedUserId: string) {
    const doctorId = data.doctorId;
    if (!doctorId) throw new BadRequestException('A doctor must be selected');

    return await prisma.$transaction(async (tx) => {
      // 1. Verify/find or fallback doctor
      let doctor = await tx.doctor.findUnique({ where: { id: doctorId } });
      if (!doctor) {
        // Fallback: find any registered doctor with a linked User account in the DB
        const linkedDoctors = await tx.doctor.findMany({
          where: { userId: { not: '' } },
          include: { user: { select: { id: true, fullName: true, email: true, role: true } } },
        });
        if (linkedDoctors.length > 0) {
          doctor = linkedDoctors[0];
        } else {
          doctor = await tx.doctor.findFirst();
        }
      }

      if (!doctor) {
        throw new NotFoundException('Selected doctor was not found');
      }

      if (!doctor.userId && doctor.name) {
        const normalizedName = doctor.name.replace(/^dr\.?\s*/i, '').trim().toLowerCase();
        const linkedDoctors = await tx.doctor.findMany({
          where: { userId: { not: '' } },
          include: {
            user: {
              select: { id: true, fullName: true, email: true, role: true },
            },
          },
        });
        const linkedMatch = linkedDoctors.find((candidate) =>
          candidate.user?.fullName.replace(/^dr\.?\s*/i, '').trim().toLowerCase() === normalizedName,
        );
        if (linkedMatch) doctor = linkedMatch;
      }

      if (!doctor.userId) {
        const doctorUser = await tx.user.findFirst({ where: { role: Role.DOCTOR } });
        if (doctorUser) {
          doctor = await tx.doctor.update({
            where: { id: doctor.id },
            data: { userId: doctorUser.id },
          });
        }
      }

      if (!doctor.userId) throw new BadRequestException('Selected doctor is not available for online booking');

      // 2. Create or reuse User (Patient)
      const user = await tx.user.findUnique({ where: { id: authenticatedUserId } });
      if (!user || user.role !== Role.PATIENT) {
        throw new BadRequestException('A valid patient account is required');
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
      } else {
        patient = await tx.patient.update({
          where: { id: patient.id },
          data: {
            ...(data.patientAge && { age: String(data.patientAge) }),
            ...(data.patientGender && { gender: data.patientGender }),
            ...(data.patientHeight && { height: String(data.patientHeight) }),
            ...(data.patientWeight && { weight: String(data.patientWeight) }),
            ...(data.patientBloodGroup && { bloodGroup: data.patientBloodGroup }),
            ...(data.patientPhone && { phone: data.patientPhone }),
          },
        });
      }

      // 4. Safely convert date + time slot into scheduledAt
      let scheduledAt = new Date();
      if (data.date) {
        if (typeof data.date === 'string') {
          const lowerDate = data.date.toLowerCase();
          if (lowerDate.includes('tomorrow')) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + 1);
            scheduledAt = targetDate;
          } else if (lowerDate.includes('today')) {
            scheduledAt = new Date();
          } else {
            // Try YYYY-MM-DD format first (sent by the frontend)
            const isoMatch = data.date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (isoMatch) {
              scheduledAt = new Date(
                parseInt(isoMatch[1], 10),
                parseInt(isoMatch[2], 10) - 1,
                parseInt(isoMatch[3], 10),
              );
            } else {
              // Fallback: try Date.parse for other formats
              const parsed = Date.parse(data.date);
              if (!isNaN(parsed)) {
                scheduledAt = new Date(parsed);
              }
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

      if (scheduledAt.getTime() < Date.now() + 30 * 60 * 1000) {
        throw new BadRequestException(
          'Appointments must be booked at least 30 minutes in advance',
        );
      }


      const occupiedSlot = await tx.appointment.findFirst({
        where: {
          doctorId: doctor.id,
          scheduledAt,
          status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
        },
        select: { id: true },
      });
      if (occupiedSlot) throw new ConflictException('This appointment slot is already booked. Please choose another time.');

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
          isFollowUp: Boolean(data.isFollowUp),
          emailRemindersEnabled: data.emailRemindersEnabled !== false,
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
    }, { isolationLevel: 'Serializable' }).then(async (createdAppt) => {
      try {
        await this.scheduleStandardReminders(createdAppt);
        if (createdAppt.isFollowUp && createdAppt.emailRemindersEnabled) await this.scheduleFollowUpReminders(createdAppt);
      } catch (err: any) {
        console.warn('[BullMQ Warning] Could not enqueue reminder jobs:', err?.message || err);
      }

      return createdAppt;
    }).catch((error) => {
      if (error instanceof HttpException) throw error;
      if (error?.code === 'P2002' || error?.code === 'P2034') {
        throw new ConflictException('This appointment slot is already booked. Please choose another time.');
      }
      console.error('Error booking appointment in transaction:', error);
      throw new InternalServerErrorException('Failed to book appointment');
    });
  }

  async getAllAppointments() {
    const apps = await prisma.appointment.findMany({
      orderBy: { createdAt: 'desc' },
      include: { doctor: true, patient: true },
    });

    return apps.map(app => {
      const dateObj = app.scheduledAt ? new Date(app.scheduledAt) : new Date();
      const formattedDate = isNaN(dateObj.getTime())
        ? new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
        : dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

      let cleanDate = app.date;
      if (!cleanDate || cleanDate.includes('May') || cleanDate.includes('2024') || cleanDate.includes('Thu 23')) {
        cleanDate = formattedDate;
      }

      return {
        ...app,
        date: cleanDate,
      };
    });
  }

  private async scheduleStandardReminders(appointment: any) {
    if (!appointment.scheduledAt) return;
    const now = Date.now();
    const scheduled = new Date(appointment.scheduledAt).getTime();
    for (const minutes of [60, 30]) {
      const triggerAt = scheduled - minutes * 60 * 1000;
      if (triggerAt <= now) continue;
      const jobId = `appointment-${appointment.id}-${minutes}min`;
      const existing = await this.appointmentQueue.getJob(jobId);
      if (existing) await existing.remove().catch(() => undefined);
      await this.appointmentQueue.add(`send-${minutes}min-reminder`, {
        appointmentId: appointment.id,
        patientId: appointment.patientId || '',
        doctorId: appointment.doctorId,
        patientName: appointment.patientName || 'Patient',
        scheduledAt: new Date(appointment.scheduledAt).toISOString(),
        consultMode: appointment.consultMode || 'VIDEO',
        reminderType: `${minutes}min`,
      }, { delay: triggerAt - now, jobId, removeOnComplete: 100, removeOnFail: 100 });
    }
  }

  private async scheduleFollowUpReminders(appointment: any) {
    if (!appointment.scheduledAt) return;
    const now = Date.now();
    const scheduled = new Date(appointment.scheduledAt).getTime();
    const lead = scheduled - now;
    if (lead <= 0) return;
    const day = 24 * 60 * 60 * 1000;
    const hour = 60 * 60 * 1000;
    const offsets = lead >= 8 * day
      ? [7 * day, 3 * day, day, 2 * hour]
      : [lead * 0.8, lead * 0.55, lead * 0.3, Math.min(2 * hour, lead * 0.1)];
    const labels = lead >= 8 * day
      ? ['7 days', '3 days', '24 hours', '2 hours']
      : ['early reminder', 'midway reminder', 'upcoming reminder', 'final reminder'];

    await Promise.all(offsets.map(async (offset, index) => {
      const jobId = `follow-up-${appointment.id}-${index + 1}`;
      const existing = await this.appointmentQueue.getJob(jobId);
      if (existing) await existing.remove().catch(() => undefined);
      const triggerAt = scheduled - offset;
      if (triggerAt <= now) return;
      await this.appointmentQueue.add('send-follow-up-email-reminder', {
        appointmentId: appointment.id,
        patientId: appointment.patientId || '',
        doctorId: appointment.doctorId,
        patientName: appointment.patientName || 'Patient',
        scheduledAt: new Date(appointment.scheduledAt).toISOString(),
        consultMode: appointment.consultMode || 'VIDEO',
        reminderType: `follow-up-${index + 1}`,
        reminderLabel: labels[index],
      }, { delay: triggerAt - now, jobId, removeOnComplete: 100, removeOnFail: 100 });
    }));
  }

  async getAppointmentsForUser(userId: string, role: string) {
    if (role === Role.PATIENT) {
      await prisma.appointment.updateMany({
        where: {
          patient: { is: { userId } },
          status: { in: ['SCHEDULED', 'WAITING'] },
          scheduledAt: { lt: new Date(Date.now() - 45 * 60 * 1000) },
        },
        data: { status: 'CANCELLED' },
      });
      return prisma.appointment.findMany({
        where: { patient: { is: { userId } } },
        orderBy: { createdAt: 'desc' },
        include: { doctor: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } }, prescription: true, ehrRecord: true },
      });
    }
    if (role === Role.DOCTOR) {
      return prisma.appointment.findMany({
        where: { doctor: { is: { userId } } },
        orderBy: { createdAt: 'desc' },
        include: { patient: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } }, prescription: true, ehrRecord: true },
      });
    }
    return [];
  }

  async getAppointmentForUser(appointmentId: string, userId: string, role: string) {
    const appointment = await prisma.appointment.findFirst({
      where: {
        OR: [
          { id: appointmentId },
          { patientId: appointmentId },
        ],
        ...(role === Role.PATIENT
          ? { patient: { is: { userId } } }
          : role === Role.DOCTOR
            ? { doctor: { is: { userId } } }
            : { id: '__unauthorized__' }),
      },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } },
        doctor: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } },
        prescription: true,
        ehrRecord: true,
      },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');

    let ageFromDateOfBirth = '';
    if (appointment.patient?.dateOfBirth) {
      const today = new Date();
      const birthDate = new Date(appointment.patient.dateOfBirth);
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDifference = today.getMonth() - birthDate.getMonth();
      if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) age -= 1;
      if (age >= 0) ageFromDateOfBirth = String(age);
    }

    return {
      ...appointment,
      patientAge: appointment.patientAge || appointment.patient?.age || ageFromDateOfBirth,
      patientGender: appointment.patientGender || appointment.patient?.gender || '',
      patientHeight: appointment.patientHeight || appointment.patient?.height || '',
      patientWeight: appointment.patientWeight || appointment.patient?.weight || '',
      patientBloodGroup: appointment.patientBloodGroup || appointment.patient?.bloodGroup || '',
      patientPhone: appointment.patientPhone || appointment.patient?.phone || '',
    };
  }

  async rescheduleAppointment(appointmentId: string, data: any, userId: string, role: string) {
    if (role !== Role.PATIENT) throw new BadRequestException('Only patients can reschedule appointments');
    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { is: { userId } } },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
      throw new BadRequestException('Completed or cancelled appointments cannot be rescheduled');
    }

    const dateLabel = String(data.date || '');
    const scheduledAt = new Date();
    if (/tomorrow/i.test(dateLabel)) scheduledAt.setDate(scheduledAt.getDate() + 1);
    else if (!/today/i.test(dateLabel)) {
      const parsedDate = new Date(dateLabel);
      if (!Number.isNaN(parsedDate.getTime())) scheduledAt.setTime(parsedDate.getTime());
      else scheduledAt.setTime(Number.NaN);
    }
    const match = String(data.timeSlot || '').match(/(\d+):?(\d*)\s*(AM|PM)/i);
    if (Number.isNaN(scheduledAt.getTime()) || !match) throw new BadRequestException('Select a valid date and time');
    let hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    if (match[3].toUpperCase() === 'PM' && hours < 12) hours += 12;
    if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
    scheduledAt.setHours(hours, minutes, 0, 0);
    if (scheduledAt.getTime() < Date.now() + 30 * 60 * 1000) {
      throw new BadRequestException('Appointments must be scheduled at least 30 minutes in advance');
    }

    return prisma.$transaction(async (tx) => {
      const existingConflict = await tx.appointment.findFirst({
        where: {
          doctorId: data.doctorId || appointment.doctorId,
          scheduledAt,
          status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] },
          id: { not: appointmentId },
        },
      });
      if (existingConflict) {
        throw new ConflictException('The requested reschedule time slot is already booked');
      }

      return tx.appointment.update({
        where: { id: appointmentId },
        data: {
          scheduledAt,
          date: data.date,
          timeSlot: data.timeSlot,
          doctorId: data.doctorId || appointment.doctorId,
          status: 'SCHEDULED',
        },
        include: { doctor: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } }, prescription: true, ehrRecord: true },
      });
    }, { isolationLevel: 'Serializable' }).then(async (updated) => {
      await this.scheduleStandardReminders(updated);
      if (updated.isFollowUp && updated.emailRemindersEnabled) await this.scheduleFollowUpReminders(updated);
      return updated;
    }).catch((err) => {
      if (err instanceof HttpException) throw err;
      if (err?.code === 'P2002' || err?.code === 'P2034') {
        throw new ConflictException('The requested reschedule time slot is already booked');
      }
      throw new InternalServerErrorException('Failed to reschedule appointment');
    });
  }

  async cancelAppointment(appointmentId: string, userId: string, role: string) {
    if (role !== Role.PATIENT) throw new BadRequestException('Only patients can cancel appointments');

    const appointment = await prisma.appointment.findFirst({
      where: { id: appointmentId, patient: { is: { userId } } },
    });
    if (!appointment) throw new NotFoundException('Appointment not found');
    if (appointment.status === 'COMPLETED' || appointment.status === 'CANCELLED') {
      throw new BadRequestException('Completed or cancelled appointments cannot be cancelled again');
    }

    try {
      const cancelled = await prisma.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CANCELLED' },
        include: {
          doctor: { include: { user: { select: { id: true, fullName: true, email: true, role: true } } } },
          prescription: true,
          ehrRecord: true,
        },
      });

      const reminderPrefixes = [`appointment-${appointmentId}-`];
      for (const prefix of reminderPrefixes) {
        await this.appointmentQueue
          .getJobs('delayed', 0, -1, true)
          .then((jobs) =>
            Promise.all(
              jobs
                .filter((j) => j.id && j.id.startsWith(prefix))
                .map((j) => j.remove().catch(() => undefined)),
            ),
          )
          .catch(() => undefined);
      }

      return cancelled;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err?.code === 'P2025') throw new NotFoundException('Appointment not found');
      throw new InternalServerErrorException('Failed to cancel appointment');
    }
  }

  async getAppointmentsForDoctor(doctorId: string) {
    const appointments = await prisma.appointment.findMany({
      where: { doctorId },
      orderBy: { createdAt: 'desc' },
      include: {
        patient: {
          include: {
            user: { select: { id: true, fullName: true, email: true, role: true } }
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
