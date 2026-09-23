import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmergencyHandlingService } from '../chatbot/services/emergency-handling.service';
import { QuickRegisterPatientDto } from './dto/quick-register-patient.dto';
import { AshaCreateAppointmentDto } from './dto/asha-create-appointment.dto';

function formatDoctorName(name?: string | null): string {
  if (!name || !name.trim()) return 'Doctor';
  const trimmed = name.trim();
  const stripped = trimmed.replace(/^((dr|doctor)\b\.?\s*)+/i, '').trim();
  if (!stripped) return 'Doctor';
  return `Dr. ${stripped}`;
}

@Injectable()
export class AshaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emergencyHandlingService: EmergencyHandlingService,
  ) {}

  /**
   * Helper: Resolve AshaWorker record by User ID
   */
  async getAshaWorkerByUserId(userId: string) {
    let worker = await this.prisma.ashaWorker.findUnique({
      where: { userId },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
    });

    if (!worker) {
      // Auto-provision if user has ASHA role but worker row was not created
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user || user.role !== 'ASHA') {
        throw new NotFoundException('ASHA worker profile not found');
      }
      worker = await this.prisma.ashaWorker.create({
        data: {
          userId: user.id,
          workerCode: `ASHA-${user.id.substring(0, 6).toUpperCase()}`,
          assignedArea: 'Assigned Health Area',
        },
        include: { user: { select: { id: true, fullName: true, email: true, phone: true } } },
      });
    }

    return worker;
  }

  /**
   * GET /api/asha/dashboard
   */
  async getDashboard(userId: string) {
    const worker = await this.getAshaWorkerByUserId(userId);

    // 1. Caseload patients (assigned to this worker or registered by this worker or in their area)
    const caseloadCondition = {
      OR: [
        { assignedAshaWorkerId: worker.id },
        { registeredByAshaId: worker.id },
        ...(worker.assignedArea ? [{ assignedArea: worker.assignedArea }] : []),
      ],
    };

    const assignedPatientsCount = await this.prisma.patient.count({
      where: caseloadCondition,
    });

    const caseloadPatientIds = (
      await this.prisma.patient.findMany({
        where: caseloadCondition,
        select: { id: true },
      })
    ).map((p) => p.id);

    // 2. Today's appointments for this caseload
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    const todayStr = startOfToday.toISOString().split('T')[0];

    const todayAppointmentsCount = await this.prisma.appointment.count({
      where: {
        OR: [
          { bookedByAshaId: worker.id },
          { patientId: { in: caseloadPatientIds } },
        ],
        AND: [
          {
            OR: [
              { date: todayStr },
              { scheduledAt: { gte: startOfToday, lte: endOfToday } },
            ],
          },
          { status: { notIn: ['CANCELLED', 'EXPIRED'] } },
        ],
      },
    });

    // 3. Overdue follow-ups
    const overdueFollowupsCount = await this.prisma.appointment.count({
      where: {
        isFollowUp: true,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        OR: [
          { bookedByAshaId: worker.id },
          { patientId: { in: caseloadPatientIds } },
        ],
        scheduledAt: { lt: startOfToday },
      },
    });

    // 4. Open emergency flags
    const caseloadAppointments = await this.prisma.appointment.findMany({
      where: {
        OR: [
          { bookedByAshaId: worker.id },
          { patientId: { in: caseloadPatientIds } },
        ],
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
      select: {
        id: true,
        healthConcern: true,
        symptoms: true,
        severity: true,
        urgency: true,
        verifiedByAsha: true,
      },
    });

    const openEmergenciesCount = caseloadAppointments.filter((appt) => {
      if (appt.verifiedByAsha) return false;
      return this.emergencyHandlingService.isEmergency(
        appt.healthConcern,
        appt.symptoms,
        appt.severity,
        appt.urgency,
      );
    }).length;

    // Recent items for dashboard feed
    const recentAppointments = await this.prisma.appointment.findMany({
      where: {
        OR: [
          { bookedByAshaId: worker.id },
          { patientId: { in: caseloadPatientIds } },
        ],
      },
      include: {
        doctor: { select: { id: true, name: true, specialty: true, imageUrl: true } },
        patient: { select: { id: true, name: true, phone: true, village: true, user: { select: { fullName: true } } } },
        payment: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    });

    return {
      worker: {
        id: worker.id,
        workerCode: worker.workerCode,
        assignedArea: worker.assignedArea,
        village: worker.village,
        subCenterId: worker.subCenterId,
        fullName: worker.user?.fullName,
        phone: worker.user?.phone,
      },
      counts: {
        assignedPatients: assignedPatientsCount,
        todayAppointments: todayAppointmentsCount,
        overdueFollowups: overdueFollowupsCount,
        openEmergencies: openEmergenciesCount,
      },
      recentAppointments: recentAppointments.map((a) => ({
        id: a.id,
        patientName: a.patientName || a.patient?.name || a.patient?.user?.fullName || 'Patient',
        patientPhone: a.patientPhone || a.patient?.phone,
        patientVillage: a.patient?.village || worker.village,
        doctorName: formatDoctorName(a.doctor?.name),
        doctorSpecialty: a.doctor?.specialty,
        doctorImageUrl: a.doctor?.imageUrl,
        date: a.date,
        timeSlot: a.timeSlot,
        scheduledAt: a.scheduledAt,
        status: a.status,
        consultMode: a.consultMode,
        healthConcern: a.healthConcern,
        isFollowUp: a.isFollowUp,
        paymentStatus: a.payment?.status || 'PENDING',
        verifiedByAsha: a.verifiedByAsha,
      })),
    };
  }

  /**
   * GET /api/asha/patients
   * Caseload list with optional search (?search=)
   */
  async getPatients(userId: string, search?: string) {
    const worker = await this.getAshaWorkerByUserId(userId);

    const baseWhere: any = {
      OR: [
        { assignedAshaWorkerId: worker.id },
        { registeredByAshaId: worker.id },
        ...(worker.assignedArea ? [{ assignedArea: worker.assignedArea }] : []),
      ],
    };

    if (search && search.trim()) {
      const q = search.trim();
      baseWhere.AND = [
        {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { phone: { contains: q, mode: 'insensitive' } },
            { village: { contains: q, mode: 'insensitive' } },
            { user: { fullName: { contains: q, mode: 'insensitive' } } },
            { user: { phone: { contains: q, mode: 'insensitive' } } },
          ],
        },
      ];
    }

    const patients = await this.prisma.patient.findMany({
      where: baseWhere,
      include: {
        user: { select: { fullName: true, phone: true, email: true } },
        appointments: {
          select: {
            id: true,
            scheduledAt: true,
            date: true,
            status: true,
            healthConcern: true,
            symptoms: true,
            severity: true,
            urgency: true,
            verifiedByAsha: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: { id: 'desc' },
    });

    return patients.map((p) => {
      const displayName = p.name || p.user?.fullName || 'Unknown Patient';
      const displayPhone = p.phone || p.user?.phone || 'No phone';
      const lastAppt = p.appointments[0];

      const hasEmergency = p.appointments.some(
        (a) =>
          !a.verifiedByAsha &&
          this.emergencyHandlingService.isEmergency(a.healthConcern, a.symptoms, a.severity, a.urgency),
      );

      return {
        id: p.id,
        name: displayName,
        phone: displayPhone,
        gender: p.gender || 'Not specified',
        age: p.age || (p.dateOfBirth ? `${new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()}` : null),
        village: p.village || worker.village || 'Local Area',
        assignedArea: p.assignedArea || worker.assignedArea,
        isAshaRegistered: p.isAshaRegistered,
        hasAccount: Boolean(p.userId),
        bloodGroup: p.bloodGroup,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
        emergencyContact: p.emergencyContact,
        lastVisitDate: lastAppt?.date || (lastAppt?.scheduledAt ? lastAppt.scheduledAt.toISOString().split('T')[0] : null),
        lastStatus: lastAppt?.status || null,
        hasEmergencyFlag: hasEmergency,
        totalAppointments: p.appointments.length,
      };
    });
  }

  /**
   * GET /api/asha/patients/:id
   */
  async getPatientDetail(userId: string, patientId: string) {
    const worker = await this.getAshaWorkerByUserId(userId);

    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: { select: { id: true, fullName: true, phone: true, email: true } },
        appointments: {
          include: {
            doctor: { select: { id: true, name: true, specialty: true, hospital: true, imageUrl: true } },
            payment: { select: { status: true, amount: true } },
            prescription: true,
            ehrRecord: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        ehrRecords: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        prescriptions: {
          include: { doctor: { select: { name: true, specialty: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient record not found');
    }

    const displayName = patient.name || patient.user?.fullName || 'Patient';
    const displayPhone = patient.phone || patient.user?.phone || '';

    return {
      id: patient.id,
      name: displayName,
      phone: displayPhone,
      email: patient.user?.email || null,
      gender: patient.gender,
      age: patient.age,
      dateOfBirth: patient.dateOfBirth,
      village: patient.village || worker.village,
      assignedArea: patient.assignedArea || worker.assignedArea,
      bloodGroup: patient.bloodGroup,
      height: patient.height,
      weight: patient.weight,
      emergencyContact: patient.emergencyContact,
      allergies: patient.allergies,
      chronicConditions: patient.chronicConditions,
      isAshaRegistered: patient.isAshaRegistered,
      hasAccount: Boolean(patient.userId),
      appointments: patient.appointments.map((a) => ({
        id: a.id,
        doctorName: formatDoctorName(a.doctor?.name),
        specialty: a.doctor?.specialty,
        hospital: a.doctor?.hospital,
        date: a.date,
        timeSlot: a.timeSlot,
        scheduledAt: a.scheduledAt,
        status: a.status,
        consultMode: a.consultMode,
        healthConcern: a.healthConcern,
        symptoms: a.symptoms,
        severity: a.severity,
        urgency: a.urgency,
        isFollowUp: a.isFollowUp,
        paymentStatus: a.payment?.status,
        verifiedByAsha: a.verifiedByAsha,
        prescription: a.prescription,
      })),
      ehrRecords: patient.ehrRecords.map((e) => ({
        id: e.id,
        diagnosis: e.diagnosis,
        notes: e.notes,
        aiSummary: e.aiSummary,
        createdAt: e.createdAt,
        status: e.status,
      })),
      prescriptions: patient.prescriptions.map((pr) => ({
        id: pr.id,
        doctorName: formatDoctorName(pr.doctor?.name),
        specialty: pr.doctor?.specialty,
        diagnosis: pr.diagnosis,
        medicines: pr.medicines,
        dietAdvice: pr.dietAdvice,
        createdAt: pr.createdAt,
      })),
    };
  }

  /**
   * POST /api/asha/patients/quick-register
   * Creates on-the-spot Patient with isAshaRegistered: true and no User account
   */
  async quickRegisterPatient(userId: string, dto: QuickRegisterPatientDto) {
    const worker = await this.getAshaWorkerByUserId(userId);

    // Optional duplicate check by phone within the village / worker's area
    const existing = await this.prisma.patient.findFirst({
      where: {
        phone: dto.phone,
        OR: [
          { assignedAshaWorkerId: worker.id },
          { registeredByAshaId: worker.id },
          { village: dto.village },
        ],
      },
    });

    if (existing) {
      return {
        isExisting: true,
        message: 'A patient with this phone number already exists in your caseload.',
        patient: {
          id: existing.id,
          name: existing.name || dto.fullName,
          phone: existing.phone,
          village: existing.village,
        },
      };
    }

    const patient = await this.prisma.patient.create({
      data: {
        name: dto.fullName.trim(),
        gender: dto.gender,
        phone: dto.phone.trim(),
        village: dto.village.trim(),
        assignedArea: dto.assignedArea || worker.assignedArea || 'Local Sub-Center Area',
        age: dto.age ? String(dto.age) : null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        bloodGroup: dto.bloodGroup || null,
        height: dto.height || null,
        weight: dto.weight || null,
        emergencyContact: dto.emergencyContact || null,
        allergies: dto.allergies || [],
        chronicConditions: dto.chronicConditions || [],
        assignedAshaWorkerId: worker.id,
        registeredByAshaId: worker.id,
        isAshaRegistered: true,
      },
    });

    return {
      isExisting: false,
      message: 'Patient registered successfully in your ASHA caseload.',
      patient: {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        village: patient.village,
        gender: patient.gender,
        age: patient.age,
        isAshaRegistered: true,
      },
    };
  }

  /**
   * POST /api/asha/appointments
   * Books an appointment on behalf of a patient with cash/waived status
   */
  async bookAppointment(userId: string, dto: AshaCreateAppointmentDto) {
    const worker = await this.getAshaWorkerByUserId(userId);

    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
      include: { user: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: dto.doctorId },
      include: { user: true },
    });
    if (!doctor) {
      throw new NotFoundException('Doctor not found');
    }

    // Parse scheduled date
    let scheduledAt = new Date();
    if (dto.date) {
      const parsed = Date.parse(dto.date);
      if (!isNaN(parsed)) {
        scheduledAt = new Date(parsed);
      }
    }

    if (dto.timeSlot) {
      const timeParts = dto.timeSlot.match(/(\d+):?(\d*)\s*(AM|PM)/i);
      if (timeParts) {
        let hours = parseInt(timeParts[1], 10);
        const minutes = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
        const ampm = timeParts[3].toUpperCase();
        if (ampm === 'PM' && hours < 12) hours += 12;
        if (ampm === 'AM' && hours === 12) hours = 0;
        scheduledAt.setHours(hours, minutes, 0, 0);
      }
    }

    const patientName = patient.name || patient.user?.fullName || 'Patient';
    const patientPhone = patient.phone || patient.user?.phone || null;

    const appointment = await this.prisma.$transaction(async (tx) => {
      const appt = await tx.appointment.create({
        data: {
          patientId: patient.id,
          doctorId: doctor.id,
          scheduledAt,
          status: 'WAITING',
          date: dto.date,
          timeSlot: dto.timeSlot,
          consultMode: dto.consultMode || 'In-Person Visit',
          healthConcern: dto.healthConcern || null,
          symptoms: Array.isArray(dto.symptoms) ? dto.symptoms : [],
          duration: dto.duration || null,
          severity: dto.severity || 'Mild',
          urgency: dto.urgency || 'ROUTINE',
          notes: dto.notes || null,
          patientName,
          patientPhone,
          patientGender: patient.gender,
          patientAge: patient.age,
          patientBloodGroup: patient.bloodGroup,
          bookedByAshaId: worker.id,
          priority: dto.severity?.toLowerCase() === 'emergency' ? 'EMERGENCY' : 'ROUTINE',
        },
      });

      // Create linked payment marked as CASH_PENDING or WAIVED
      await tx.payment.create({
        data: {
          patientId: patient.id,
          appointmentId: appt.id,
          amount: doctor.consultationFee || 500,
          currency: 'INR',
          status: dto.paymentStatus || 'CASH_PENDING',
        },
      });

      // Initial triage note in EHR
      const concernStr = [
        dto.healthConcern ? `Health Concern: ${dto.healthConcern}` : '',
        dto.symptoms?.length ? `Reported Symptoms: ${dto.symptoms.join(', ')}` : '',
        dto.severity ? `Severity: ${dto.severity}` : '',
        `Booked via ASHA Community Worker: ${worker.user?.fullName || worker.workerCode}`,
      ]
        .filter(Boolean)
        .join('\n');

      await tx.ehrRecord.create({
        data: {
          patientId: patient.id,
          appointmentId: appt.id,
          notes: concernStr,
          status: 'DRAFT',
        },
      });

      return appt;
    });

    return {
      message: 'Appointment booked successfully on behalf of patient.',
      appointment: {
        id: appointment.id,
        patientId: appointment.patientId,
        patientName,
        doctorId: appointment.doctorId,
        doctorName: doctor.name,
        date: appointment.date,
        timeSlot: appointment.timeSlot,
        status: appointment.status,
        consultMode: appointment.consultMode,
        paymentStatus: dto.paymentStatus || 'CASH_PENDING',
      },
    };
  }

  /**
   * GET /api/asha/followups/overdue
   */
  async getOverdueFollowups(userId: string) {
    const worker = await this.getAshaWorkerByUserId(userId);

    const caseloadCondition = {
      OR: [
        { assignedAshaWorkerId: worker.id },
        { registeredByAshaId: worker.id },
        ...(worker.assignedArea ? [{ assignedArea: worker.assignedArea }] : []),
      ],
    };

    const caseloadPatientIds = (
      await this.prisma.patient.findMany({
        where: caseloadCondition,
        select: { id: true },
      })
    ).map((p) => p.id);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const overdueList = await this.prisma.appointment.findMany({
      where: {
        isFollowUp: true,
        status: { notIn: ['COMPLETED', 'CANCELLED'] },
        OR: [
          { bookedByAshaId: worker.id },
          { patientId: { in: caseloadPatientIds } },
        ],
        scheduledAt: { lt: startOfToday },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true, village: true, user: { select: { fullName: true } } } },
        doctor: { select: { id: true, name: true, specialty: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return overdueList.map((a) => ({
      id: a.id,
      patientId: a.patientId,
      patientName: a.patientName || a.patient?.name || a.patient?.user?.fullName || 'Patient',
      patientPhone: a.patientPhone || a.patient?.phone,
      patientVillage: a.patient?.village || worker.village,
      doctorName: a.doctor?.name ? formatDoctorName(a.doctor.name) : undefined,
      doctorSpecialty: a.doctor?.specialty,
      scheduledDate: a.date || a.scheduledAt?.toISOString().split('T')[0],
      timeSlot: a.timeSlot,
      healthConcern: a.healthConcern,
      daysOverdue: a.scheduledAt
        ? Math.max(1, Math.floor((Date.now() - a.scheduledAt.getTime()) / (1000 * 60 * 60 * 24)))
        : 1,
    }));
  }

  /**
   * GET /api/asha/emergencies
   */
  async getEmergencies(userId: string) {
    const worker = await this.getAshaWorkerByUserId(userId);

    const caseloadCondition = {
      OR: [
        { assignedAshaWorkerId: worker.id },
        { registeredByAshaId: worker.id },
        ...(worker.assignedArea ? [{ assignedArea: worker.assignedArea }] : []),
      ],
    };

    const caseloadPatientIds = (
      await this.prisma.patient.findMany({
        where: caseloadCondition,
        select: { id: true },
      })
    ).map((p) => p.id);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        OR: [
          { bookedByAshaId: worker.id },
          { patientId: { in: caseloadPatientIds } },
        ],
        status: { notIn: ['CANCELLED', 'COMPLETED'] },
      },
      include: {
        patient: { select: { id: true, name: true, phone: true, village: true, user: { select: { fullName: true } } } },
        doctor: { select: { name: true, specialty: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return appointments
      .filter((a) =>
        this.emergencyHandlingService.isEmergency(a.healthConcern, a.symptoms, a.severity, a.urgency),
      )
      .map((a) => ({
        id: a.id,
        patientId: a.patientId,
        patientName: a.patientName || a.patient?.name || a.patient?.user?.fullName || 'Patient',
        patientPhone: a.patientPhone || a.patient?.phone,
        patientVillage: a.patient?.village || worker.village,
        doctorName: a.doctor?.name ? formatDoctorName(a.doctor.name) : undefined,
        healthConcern: a.healthConcern,
        symptoms: a.symptoms,
        severity: a.severity,
        urgency: a.urgency,
        verifiedByAsha: a.verifiedByAsha,
        verifiedByAshaAt: a.verifiedByAshaAt,
        reportedAt: a.createdAt,
      }));
  }

  /**
   * PATCH /api/asha/emergencies/:appointmentId/verify
   * Allows ASHA worker to mark a flagged case as verified
   */
  async verifyEmergency(userId: string, appointmentId: string) {
    await this.getAshaWorkerByUserId(userId);

    const appt = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appt) {
      throw new NotFoundException('Appointment not found');
    }

    const updated = await this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        verifiedByAsha: true,
        verifiedByAshaAt: new Date(),
      },
    });

    return {
      message: 'Emergency flag marked as verified by ASHA worker.',
      appointmentId: updated.id,
      verifiedByAsha: updated.verifiedByAsha,
      verifiedByAshaAt: updated.verifiedByAshaAt,
    };
  }
}
