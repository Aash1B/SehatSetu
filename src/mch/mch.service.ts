import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FlagSeverity, FlagStatus, MchReminderType, PregnancyStatus, ReminderStatus, VaccinationStatus } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { prisma } from '../prisma';
import { MCH_CLINICAL_RULES } from './mch.clinical-rules';
import { buildVaccinationSchedule } from './mch.vaccination-schedule';
import { MILESTONE_DEFINITIONS } from './mch.milestones-schedule';
import { CreatePregnancyDto, UpdatePregnancyDto } from './dto/pregnancy.dto';
import { CreateAncVisitDto, UpdateAncVisitDto, VerifyAncVisitDto } from './dto/anc-visit.dto';
import { CreateInvestigationDto, UpdateInvestigationDto, VerifyInvestigationDto } from './dto/investigation.dto';
import { CreateChildDto, UpdateChildDto } from './dto/child.dto';
import { AddVaccinationDto, UpdateVaccinationDto, VerifyVaccinationDto } from './dto/vaccination.dto';
import { CreateGrowthMeasurementDto, VerifyGrowthDto } from './dto/growth.dto';
import { UpdateMilestoneDto, DoctorReviewMilestoneDto } from './dto/milestone.dto';
import { ReviewFlagDto } from './dto/safety-flag.dto';
import { CreateMchDocumentDto } from './dto/document.dto';

export interface MchActor {
  userId: string;
  role: 'PATIENT' | 'DOCTOR';
}

@Injectable()
export class MchService {
  constructor(
    @InjectQueue('mch-queue') private readonly mchQueue: Queue,
  ) {}

  // ─── Auth helpers ──────────────────────────────────────────────────────────

  private async resolvePatientId(actor: MchActor): Promise<string> {
    const patient = await prisma.patient.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!patient) throw new NotFoundException('Patient profile not found');
    return patient.id;
  }

  private async assertPatientAccess(actor: MchActor, patientId: string): Promise<void> {
    if (actor.role === 'PATIENT') {
      const patient = await prisma.patient.findUnique({ where: { userId: actor.userId }, select: { id: true } });
      if (!patient || patient.id !== patientId) throw new ForbiddenException('Access denied');
      return;
    }
    // Doctor must have at least one appointment with patient
    const link = await prisma.appointment.findFirst({
      where: { patientId, doctor: { is: { userId: actor.userId } } },
      select: { id: true },
    });
    if (!link) throw new ForbiddenException('You are not authorized to access this patient\'s MCH records');
  }

  private async assertDoctorRole(actor: MchActor): Promise<string> {
    if (actor.role !== 'DOCTOR') throw new ForbiddenException('Doctor account required');
    const doctor = await prisma.doctor.findUnique({ where: { userId: actor.userId }, select: { id: true } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    return doctor.id;
  }

  private async resolvePregnancyPatientId(pregnancyId: string): Promise<string> {
    const p = await prisma.pregnancy.findUnique({ where: { id: pregnancyId }, select: { patientId: true } });
    if (!p) throw new NotFoundException('Pregnancy not found');
    return p.patientId;
  }

  private async resolveChildPatientId(childId: string): Promise<string> {
    const c = await prisma.child.findUnique({ where: { id: childId }, select: { patientId: true } });
    if (!c) throw new NotFoundException('Child not found');
    return c.patientId;
  }

  // ─── EDD / gestational age utilities ──────────────────────────────────────

  static calculateEddFromLmp(lmpDate: Date): Date {
    // Naegele's rule: LMP + 280 days (40 weeks)
    const edd = new Date(lmpDate);
    edd.setDate(edd.getDate() + 280);
    return edd;
  }

  static calculateGestationalWeeks(lmpDate: Date, referenceDate = new Date()): number {
    const diffMs = referenceDate.getTime() - lmpDate.getTime();
    return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
  }

  static calculateTrimester(gestationalWeeks: number): 1 | 2 | 3 {
    if (gestationalWeeks <= 13) return 1;
    if (gestationalWeeks <= 26) return 2;
    return 3;
  }

  // ─── Pregnancy ─────────────────────────────────────────────────────────────

  async createPregnancy(actor: MchActor, dto: CreatePregnancyDto) {
    const patientId = await this.resolvePatientId(actor);
    // Enforce one active pregnancy at a time
    const existing = await prisma.pregnancy.findFirst({
      where: { patientId, status: PregnancyStatus.ACTIVE },
      select: { id: true },
    });
    if (existing) throw new ConflictException('An active pregnancy already exists. Complete or close it before creating a new one.');

    const lmpDate = dto.lmpDate ? new Date(dto.lmpDate) : undefined;
    const eddLmp = lmpDate ? MchService.calculateEddFromLmp(lmpDate) : undefined;

    return prisma.pregnancy.create({
      data: {
        patientId,
        lmpDate,
        eddLmp,
        eddUltrasound: dto.eddUltrasound ? new Date(dto.eddUltrasound) : undefined,
        gestationalWeeksAtBooking: dto.gestationalWeeksAtBooking,
        gravida: dto.gravida,
        para: dto.para,
        abortions: dto.abortions,
        bloodGroup: dto.bloodGroup,
        rhFactor: dto.rhFactor,
        highRiskFactors: dto.highRiskFactors ?? [],
        notes: dto.notes,
      },
    });
  }

  async listPregnancies(actor: MchActor, patientId?: string) {
    const resolvedId = actor.role === 'PATIENT' ? await this.resolvePatientId(actor) : patientId!;
    await this.assertPatientAccess(actor, resolvedId);
    return prisma.pregnancy.findMany({
      where: { patientId: resolvedId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPregnancy(actor: MchActor, pregnancyId: string) {
    const pregnancy = await prisma.pregnancy.findUnique({
      where: { id: pregnancyId },
      include: {
        ancVisits: { orderBy: { visitDate: 'desc' } },
        investigations: { orderBy: { testDate: 'desc' } },
        safetyFlags: { where: { status: FlagStatus.OPEN }, orderBy: { createdAt: 'desc' } },
        mchDocuments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!pregnancy) throw new NotFoundException('Pregnancy not found');
    await this.assertPatientAccess(actor, pregnancy.patientId);

    const today = new Date();
    const gestationalWeeks = pregnancy.lmpDate ? MchService.calculateGestationalWeeks(pregnancy.lmpDate, today) : null;
    const trimester = gestationalWeeks !== null ? MchService.calculateTrimester(gestationalWeeks) : null;
    const edd = pregnancy.eddUltrasound ?? pregnancy.eddLmp;

    return { ...pregnancy, gestationalWeeks, trimester, edd };
  }

  async updatePregnancy(actor: MchActor, pregnancyId: string, dto: UpdatePregnancyDto) {
    const pregnancy = await prisma.pregnancy.findUnique({ where: { id: pregnancyId }, select: { patientId: true, status: true } });
    if (!pregnancy) throw new NotFoundException('Pregnancy not found');
    await this.assertPatientAccess(actor, pregnancy.patientId);

    const lmpDate = dto.lmpDate ? new Date(dto.lmpDate) : undefined;
    const eddLmp = lmpDate ? MchService.calculateEddFromLmp(lmpDate) : undefined;

    return prisma.pregnancy.update({
      where: { id: pregnancyId },
      data: {
        ...(lmpDate && { lmpDate, eddLmp }),
        ...(dto.eddUltrasound && { eddUltrasound: new Date(dto.eddUltrasound) }),
        ...(dto.gestationalWeeksAtBooking !== undefined && { gestationalWeeksAtBooking: dto.gestationalWeeksAtBooking }),
        ...(dto.gravida !== undefined && { gravida: dto.gravida }),
        ...(dto.para !== undefined && { para: dto.para }),
        ...(dto.abortions !== undefined && { abortions: dto.abortions }),
        ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
        ...(dto.rhFactor !== undefined && { rhFactor: dto.rhFactor }),
        ...(dto.highRiskFactors && { highRiskFactors: dto.highRiskFactors }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.status && { status: dto.status }),
        ...(dto.deliveryDate && { deliveryDate: new Date(dto.deliveryDate) }),
        ...(dto.deliveryType !== undefined && { deliveryType: dto.deliveryType }),
        ...(dto.deliveryOutcome !== undefined && { deliveryOutcome: dto.deliveryOutcome }),
      },
    });
  }

  // ─── ANC Visits ────────────────────────────────────────────────────────────

  async createAncVisit(actor: MchActor, pregnancyId: string, dto: CreateAncVisitDto) {
    const patientId = await this.resolvePregnancyPatientId(pregnancyId);
    await this.assertPatientAccess(actor, patientId);

    const visit = await prisma.ancVisit.create({
      data: {
        pregnancyId,
        visitDate: new Date(dto.visitDate),
        gestationalWeek: dto.gestationalWeek,
        weight: dto.weight,
        systolicBp: dto.systolicBp,
        diastolicBp: dto.diastolicBp,
        pulseRate: dto.pulseRate,
        hemoglobin: dto.hemoglobin,
        fetalHeartRate: dto.fetalHeartRate,
        fundalHeight: dto.fundalHeight,
        urineProtein: dto.urineProtein,
        urineGlucose: dto.urineGlucose,
        bloodSugarFasting: dto.bloodSugarFasting,
        bloodSugarPp: dto.bloodSugarPp,
        complaints: dto.complaints,
        clinicalFindings: dto.clinicalFindings,
        advice: dto.advice,
        nextVisitDate: dto.nextVisitDate ? new Date(dto.nextVisitDate) : undefined,
        enteredByPatient: actor.role === 'PATIENT',
      },
    });

    // Schedule reminder for next visit if provided
    if (dto.nextVisitDate) {
      await this.scheduleAncReminders(patientId, visit.id, new Date(dto.nextVisitDate));
    }

    // Run safety flag evaluation
    await this.evaluateAncSafetyFlags(visit.id, dto);

    return visit;
  }

  async listAncVisits(actor: MchActor, pregnancyId: string) {
    const patientId = await this.resolvePregnancyPatientId(pregnancyId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.ancVisit.findMany({
      where: { pregnancyId },
      orderBy: { visitDate: 'desc' },
      include: { safetyFlags: { where: { status: FlagStatus.OPEN } } },
    });
  }

  async updateAncVisit(actor: MchActor, visitId: string, dto: UpdateAncVisitDto) {
    const visit = await prisma.ancVisit.findUnique({ where: { id: visitId }, select: { pregnancyId: true } });
    if (!visit) throw new NotFoundException('ANC visit not found');
    const patientId = await this.resolvePregnancyPatientId(visit.pregnancyId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.ancVisit.update({
      where: { id: visitId },
      data: {
        ...(dto.visitDate && { visitDate: new Date(dto.visitDate) }),
        ...(dto.gestationalWeek !== undefined && { gestationalWeek: dto.gestationalWeek }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(dto.systolicBp !== undefined && { systolicBp: dto.systolicBp }),
        ...(dto.diastolicBp !== undefined && { diastolicBp: dto.diastolicBp }),
        ...(dto.pulseRate !== undefined && { pulseRate: dto.pulseRate }),
        ...(dto.hemoglobin !== undefined && { hemoglobin: dto.hemoglobin }),
        ...(dto.fetalHeartRate !== undefined && { fetalHeartRate: dto.fetalHeartRate }),
        ...(dto.fundalHeight !== undefined && { fundalHeight: dto.fundalHeight }),
        ...(dto.urineProtein !== undefined && { urineProtein: dto.urineProtein }),
        ...(dto.urineGlucose !== undefined && { urineGlucose: dto.urineGlucose }),
        ...(dto.bloodSugarFasting !== undefined && { bloodSugarFasting: dto.bloodSugarFasting }),
        ...(dto.bloodSugarPp !== undefined && { bloodSugarPp: dto.bloodSugarPp }),
        ...(dto.complaints !== undefined && { complaints: dto.complaints }),
        ...(dto.clinicalFindings !== undefined && { clinicalFindings: dto.clinicalFindings }),
        ...(dto.advice !== undefined && { advice: dto.advice }),
        ...(dto.nextVisitDate && { nextVisitDate: new Date(dto.nextVisitDate) }),
      },
    });
  }

  async verifyAncVisit(actor: MchActor, visitId: string, dto: VerifyAncVisitDto) {
    const doctorId = await this.assertDoctorRole(actor);
    const visit = await prisma.ancVisit.findUnique({ where: { id: visitId }, select: { pregnancyId: true } });
    if (!visit) throw new NotFoundException('ANC visit not found');
    const patientId = await this.resolvePregnancyPatientId(visit.pregnancyId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.ancVisit.update({
      where: { id: visitId },
      data: {
        verifiedByDoctorId: doctorId,
        verifiedAt: new Date(),
        enteredByPatient: false,
        ...(dto.verificationNotes !== undefined && { verificationNotes: dto.verificationNotes }),
        ...(dto.clinicalFindings !== undefined && { clinicalFindings: dto.clinicalFindings }),
        ...(dto.advice !== undefined && { advice: dto.advice }),
      },
    });
  }

  // ─── Investigations ────────────────────────────────────────────────────────

  async createInvestigation(actor: MchActor, pregnancyId: string, dto: CreateInvestigationDto) {
    const patientId = await this.resolvePregnancyPatientId(pregnancyId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.pregnancyInvestigation.create({
      data: {
        pregnancyId,
        testName: dto.testName,
        testDate: dto.testDate ? new Date(dto.testDate) : undefined,
        result: dto.result,
        unit: dto.unit,
        referenceRange: dto.referenceRange,
        notes: dto.notes,
        reportId: dto.reportId,
        enteredByPatient: actor.role === 'PATIENT',
      },
    });
  }

  async listInvestigations(actor: MchActor, pregnancyId: string) {
    const patientId = await this.resolvePregnancyPatientId(pregnancyId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.pregnancyInvestigation.findMany({
      where: { pregnancyId },
      orderBy: { testDate: 'desc' },
    });
  }

  async updateInvestigation(actor: MchActor, investigationId: string, dto: UpdateInvestigationDto) {
    const inv = await prisma.pregnancyInvestigation.findUnique({ where: { id: investigationId }, select: { pregnancyId: true } });
    if (!inv) throw new NotFoundException('Investigation not found');
    const patientId = await this.resolvePregnancyPatientId(inv.pregnancyId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.pregnancyInvestigation.update({
      where: { id: investigationId },
      data: {
        ...(dto.testName && { testName: dto.testName }),
        ...(dto.testDate && { testDate: new Date(dto.testDate) }),
        ...(dto.result !== undefined && { result: dto.result }),
        ...(dto.unit !== undefined && { unit: dto.unit }),
        ...(dto.referenceRange !== undefined && { referenceRange: dto.referenceRange }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.reportId !== undefined && { reportId: dto.reportId }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  async verifyInvestigation(actor: MchActor, investigationId: string, dto: VerifyInvestigationDto) {
    const doctorId = await this.assertDoctorRole(actor);
    const inv = await prisma.pregnancyInvestigation.findUnique({ where: { id: investigationId }, select: { pregnancyId: true } });
    if (!inv) throw new NotFoundException('Investigation not found');
    const patientId = await this.resolvePregnancyPatientId(inv.pregnancyId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.pregnancyInvestigation.update({
      where: { id: investigationId },
      data: { verifiedByDoctorId: doctorId, verifiedAt: new Date(), status: 'VERIFIED', ...(dto.notes !== undefined && { notes: dto.notes }) },
    });
  }

  // ─── Children ──────────────────────────────────────────────────────────────

  async createChild(actor: MchActor, dto: CreateChildDto) {
    const patientId = await this.resolvePatientId(actor);
    const dob = new Date(dto.dateOfBirth);
    if (dob > new Date()) throw new BadRequestException('Date of birth cannot be in the future');

    const child = await prisma.child.create({
      data: {
        patientId,
        name: dto.name,
        dateOfBirth: dob,
        sex: dto.sex,
        bloodGroup: dto.bloodGroup,
        birthWeight: dto.birthWeight,
        birthLength: dto.birthLength,
        birthHeadCirc: dto.birthHeadCirc,
        notes: dto.notes,
      },
    });

    // Auto-generate vaccination schedule and milestone templates
    await this.generateVaccinationSchedule(child.id, dob);
    await this.generateMilestoneTemplates(child.id);

    return child;
  }

  async listChildren(actor: MchActor, patientId?: string) {
    const resolvedId = actor.role === 'PATIENT' ? await this.resolvePatientId(actor) : patientId!;
    await this.assertPatientAccess(actor, resolvedId);
    return prisma.child.findMany({
      where: { patientId: resolvedId },
      orderBy: { dateOfBirth: 'asc' },
    });
  }

  async getChild(actor: MchActor, childId: string) {
    const child = await prisma.child.findUnique({
      where: { id: childId },
      include: {
        vaccinationRecords: { orderBy: { scheduledDate: 'asc' } },
        growthMeasurements: { orderBy: { measurementDate: 'desc' }, take: 10 },
        milestones: { orderBy: { expectedAgeMonths: 'asc' } },
        safetyFlags: { where: { status: FlagStatus.OPEN } },
      },
    });
    if (!child) throw new NotFoundException('Child not found');
    await this.assertPatientAccess(actor, child.patientId);
    return child;
  }

  async updateChild(actor: MchActor, childId: string, dto: UpdateChildDto) {
    const patientId = await this.resolveChildPatientId(childId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.child.update({
      where: { id: childId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bloodGroup !== undefined && { bloodGroup: dto.bloodGroup }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  private async generateVaccinationSchedule(childId: string, dob: Date) {
    const schedule = buildVaccinationSchedule(dob);
    await prisma.vaccinationRecord.createMany({
      data: schedule.map((dose) => ({
        childId,
        vaccineName: dose.vaccineName,
        doseNumber: dose.doseNumber,
        scheduledDate: dose.scheduledDate,
        status: VaccinationStatus.UPCOMING,
      })),
    });
  }

  private async generateMilestoneTemplates(childId: string) {
    await prisma.developmentalMilestone.createMany({
      data: MILESTONE_DEFINITIONS.map((m) => ({
        childId,
        category: m.category,
        milestoneName: m.milestoneName,
        expectedAgeMonths: m.expectedAgeMonths,
        expectedAgeMaxMonths: m.expectedAgeMaxMonths ?? m.expectedAgeMonths + 2,
      })),
    });
  }

  // ─── Vaccinations ──────────────────────────────────────────────────────────

  async listVaccinations(actor: MchActor, childId: string) {
    const patientId = await this.resolveChildPatientId(childId);
    await this.assertPatientAccess(actor, patientId);

    const records = await prisma.vaccinationRecord.findMany({
      where: { childId },
      orderBy: { scheduledDate: 'asc' },
    });

    const now = new Date();
    // Update statuses: UPCOMING → DUE if scheduledDate has passed and not yet administered
    const updateIds = records
      .filter((r) => r.status === VaccinationStatus.UPCOMING && r.scheduledDate < now)
      .map((r) => r.id);
    if (updateIds.length) {
      await prisma.vaccinationRecord.updateMany({
        where: { id: { in: updateIds } },
        data: { status: VaccinationStatus.DUE },
      });
    }

    return prisma.vaccinationRecord.findMany({ where: { childId }, orderBy: { scheduledDate: 'asc' } });
  }

  async addVaccination(actor: MchActor, childId: string, dto: AddVaccinationDto) {
    const patientId = await this.resolveChildPatientId(childId);
    await this.assertPatientAccess(actor, patientId);
    const scheduled = new Date(dto.scheduledDate);
    const record = await prisma.vaccinationRecord.create({
      data: {
        childId,
        vaccineName: dto.vaccineName,
        doseNumber: dto.doseNumber,
        scheduledDate: scheduled,
        status: scheduled > new Date() ? VaccinationStatus.UPCOMING : VaccinationStatus.DUE,
        notes: dto.notes,
      },
    });
    await this.scheduleVaccinationReminders(patientId, childId, record.id, scheduled);
    return record;
  }

  async recordVaccination(actor: MchActor, vaccinationRecordId: string, dto: { administeredDate: string; administeredAt?: string; batchNumber?: string; notes?: string }) {
    const record = await prisma.vaccinationRecord.findUnique({ where: { id: vaccinationRecordId }, select: { childId: true } });
    if (!record) throw new NotFoundException('Vaccination record not found');
    const patientId = await this.resolveChildPatientId(record.childId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.vaccinationRecord.update({
      where: { id: vaccinationRecordId },
      data: {
        administeredDate: new Date(dto.administeredDate),
        status: VaccinationStatus.COMPLETED,
        administeredAt: dto.administeredAt,
        batchNumber: dto.batchNumber,
        notes: dto.notes,
      },
    });
  }

  async verifyVaccination(actor: MchActor, vaccinationRecordId: string, dto: VerifyVaccinationDto) {
    const doctorId = await this.assertDoctorRole(actor);
    const record = await prisma.vaccinationRecord.findUnique({ where: { id: vaccinationRecordId }, select: { childId: true } });
    if (!record) throw new NotFoundException('Vaccination record not found');
    const patientId = await this.resolveChildPatientId(record.childId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.vaccinationRecord.update({
      where: { id: vaccinationRecordId },
      data: { verifiedByDoctorId: doctorId, verifiedAt: new Date(), ...(dto.notes !== undefined && { notes: dto.notes }) },
    });
  }

  // ─── Growth Measurements ───────────────────────────────────────────────────

  async createGrowthMeasurement(actor: MchActor, childId: string, dto: CreateGrowthMeasurementDto) {
    const patientId = await this.resolveChildPatientId(childId);
    await this.assertPatientAccess(actor, patientId);

    const child = await prisma.child.findUnique({ where: { id: childId }, select: { dateOfBirth: true } });
    const ageMonths = dto.ageMonths ?? (child
      ? Math.floor((new Date(dto.measurementDate).getTime() - child.dateOfBirth.getTime()) / (30.44 * 24 * 3600 * 1000))
      : undefined);

    let bmi: number | undefined;
    if (dto.weightKg && dto.heightCm) {
      bmi = dto.weightKg / ((dto.heightCm / 100) ** 2);
    }

    const measurement = await prisma.growthMeasurement.create({
      data: {
        childId,
        measurementDate: new Date(dto.measurementDate),
        ageMonths,
        weightKg: dto.weightKg,
        heightCm: dto.heightCm,
        headCircCm: dto.headCircCm,
        temperature: dto.temperature,
        pulseRate: dto.pulseRate,
        spo2: dto.spo2,
        bmi,
        notes: dto.notes,
        enteredByPatient: actor.role === 'PATIENT',
      },
    });

    await this.evaluateGrowthFlags(measurement.id, measurement);
    return measurement;
  }

  async listGrowthMeasurements(actor: MchActor, childId: string) {
    const patientId = await this.resolveChildPatientId(childId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.growthMeasurement.findMany({
      where: { childId },
      orderBy: { measurementDate: 'asc' },
      include: { safetyFlags: { where: { status: FlagStatus.OPEN } } },
    });
  }

  async verifyGrowthMeasurement(actor: MchActor, measurementId: string, dto: VerifyGrowthDto) {
    const doctorId = await this.assertDoctorRole(actor);
    const m = await prisma.growthMeasurement.findUnique({ where: { id: measurementId }, select: { childId: true } });
    if (!m) throw new NotFoundException('Growth measurement not found');
    const patientId = await this.resolveChildPatientId(m.childId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.growthMeasurement.update({
      where: { id: measurementId },
      data: { verifiedByDoctorId: doctorId, verifiedAt: new Date(), ...(dto.notes !== undefined && { notes: dto.notes }) },
    });
  }

  // ─── Milestones ────────────────────────────────────────────────────────────

  async listMilestones(actor: MchActor, childId: string) {
    const patientId = await this.resolveChildPatientId(childId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.developmentalMilestone.findMany({
      where: { childId },
      orderBy: [{ category: 'asc' }, { expectedAgeMonths: 'asc' }],
    });
  }

  async updateMilestone(actor: MchActor, milestoneId: string, dto: UpdateMilestoneDto) {
    const m = await prisma.developmentalMilestone.findUnique({ where: { id: milestoneId }, select: { childId: true } });
    if (!m) throw new NotFoundException('Milestone not found');
    const patientId = await this.resolveChildPatientId(m.childId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.developmentalMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.achievedDate && { achievedDate: new Date(dto.achievedDate) }),
        ...(dto.parentObservation !== undefined && { parentObservation: dto.parentObservation }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
      },
    });
  }

  async doctorReviewMilestone(actor: MchActor, milestoneId: string, dto: DoctorReviewMilestoneDto) {
    const doctorId = await this.assertDoctorRole(actor);
    const m = await prisma.developmentalMilestone.findUnique({ where: { id: milestoneId }, select: { childId: true } });
    if (!m) throw new NotFoundException('Milestone not found');
    const patientId = await this.resolveChildPatientId(m.childId);
    await this.assertPatientAccess(actor, patientId);
    return prisma.developmentalMilestone.update({
      where: { id: milestoneId },
      data: {
        verifiedByDoctorId: doctorId,
        verifiedAt: new Date(),
        needsReview: dto.status === 'NEEDS_REVIEW',
        ...(dto.doctorAssessment !== undefined && { doctorAssessment: dto.doctorAssessment }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  // ─── Safety Flags ──────────────────────────────────────────────────────────

  async listSafetyFlags(actor: MchActor, patientId?: string) {
    const resolvedId = actor.role === 'PATIENT' ? await this.resolvePatientId(actor) : patientId!;
    await this.assertPatientAccess(actor, resolvedId);

    const pregnancyIds = (await prisma.pregnancy.findMany({ where: { patientId: resolvedId }, select: { id: true } })).map(p => p.id);
    const childIds = (await prisma.child.findMany({ where: { patientId: resolvedId }, select: { id: true } })).map(c => c.id);

    return prisma.mchSafetyFlag.findMany({
      where: {
        OR: [
          ...(pregnancyIds.length ? [{ pregnancyId: { in: pregnancyIds } }] : []),
          ...(childIds.length ? [{ childId: { in: childIds } }] : []),
        ],
      },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async reviewFlag(actor: MchActor, flagId: string, dto: ReviewFlagDto) {
    const doctorId = await this.assertDoctorRole(actor);
    const flag = await prisma.mchSafetyFlag.findUnique({ where: { id: flagId } });
    if (!flag) throw new NotFoundException('Safety flag not found');

    // Verify doctor has access to the patient whose flag this is
    if (flag.pregnancyId) {
      const patientId = await this.resolvePregnancyPatientId(flag.pregnancyId);
      await this.assertPatientAccess(actor, patientId);
    } else if (flag.childId) {
      const patientId = await this.resolveChildPatientId(flag.childId);
      await this.assertPatientAccess(actor, patientId);
    }

    return prisma.mchSafetyFlag.update({
      where: { id: flagId },
      data: {
        status: FlagStatus.REVIEWED,
        reviewedByDoctorId: doctorId,
        reviewedAt: new Date(),
        ...(dto.reviewNotes !== undefined && { reviewNotes: dto.reviewNotes }),
      },
    });
  }

  private async evaluateAncSafetyFlags(visitId: string, dto: CreateAncVisitDto) {
    const rules = MCH_CLINICAL_RULES.anc;
    const flags: Array<{ severity: FlagSeverity; flagCode: string; message: string; ruleDescription: string }> = [];

    if (dto.systolicBp !== undefined) {
      if (dto.systolicBp >= rules.systolicBpCritical) {
        flags.push({ severity: FlagSeverity.CRITICAL, flagCode: 'ANC_BP_SYSTOLIC_CRITICAL', message: `Systolic BP ${dto.systolicBp} mmHg requires urgent clinical review`, ruleDescription: `Systolic BP ≥ ${rules.systolicBpCritical} mmHg — REQUIRES CLINICAL VALIDATION` });
      } else if (dto.systolicBp >= rules.systolicBpWarning) {
        flags.push({ severity: FlagSeverity.WARNING, flagCode: 'ANC_BP_SYSTOLIC_WARNING', message: `Systolic BP ${dto.systolicBp} mmHg is elevated — clinical review recommended`, ruleDescription: `Systolic BP ≥ ${rules.systolicBpWarning} mmHg — REQUIRES CLINICAL VALIDATION` });
      }
    }
    if (dto.diastolicBp !== undefined) {
      if (dto.diastolicBp >= rules.diastolicBpCritical) {
        flags.push({ severity: FlagSeverity.CRITICAL, flagCode: 'ANC_BP_DIASTOLIC_CRITICAL', message: `Diastolic BP ${dto.diastolicBp} mmHg requires urgent clinical review`, ruleDescription: `Diastolic BP ≥ ${rules.diastolicBpCritical} mmHg — REQUIRES CLINICAL VALIDATION` });
      } else if (dto.diastolicBp >= rules.diastolicBpWarning) {
        flags.push({ severity: FlagSeverity.WARNING, flagCode: 'ANC_BP_DIASTOLIC_WARNING', message: `Diastolic BP ${dto.diastolicBp} mmHg is elevated — clinical review recommended`, ruleDescription: `Diastolic BP ≥ ${rules.diastolicBpWarning} mmHg — REQUIRES CLINICAL VALIDATION` });
      }
    }
    if (dto.hemoglobin !== undefined) {
      if (dto.hemoglobin < rules.hemoglobinLowCritical) {
        flags.push({ severity: FlagSeverity.CRITICAL, flagCode: 'ANC_HB_CRITICAL', message: `Hemoglobin ${dto.hemoglobin} g/dL requires urgent clinical review`, ruleDescription: `Hemoglobin < ${rules.hemoglobinLowCritical} g/dL — REQUIRES CLINICAL VALIDATION` });
      } else if (dto.hemoglobin < rules.hemoglobinLowWarning) {
        flags.push({ severity: FlagSeverity.WARNING, flagCode: 'ANC_HB_WARNING', message: `Hemoglobin ${dto.hemoglobin} g/dL is low — clinical review recommended`, ruleDescription: `Hemoglobin < ${rules.hemoglobinLowWarning} g/dL — REQUIRES CLINICAL VALIDATION` });
      }
    }

    if (flags.length) {
      await prisma.mchSafetyFlag.createMany({
        data: flags.map(f => ({ ...f, ancVisitId: visitId })),
      });
    }
  }

  private async evaluateGrowthFlags(measurementId: string, data: { weightKg?: number | null; ageMonths?: number | null }) {
    // Placeholder: growth reference comparison requires WHO LMS tables.
    // Current implementation only flags extremely low weight for age > 1 month as INFO
    // until proper WHO reference data is loaded. REQUIRES CLINICAL VALIDATION.
    if (data.weightKg && data.ageMonths && data.ageMonths > 1 && data.weightKg < 2.5) {
      await prisma.mchSafetyFlag.create({
        data: {
          growthMeasurementId: measurementId,
          flagCode: 'GROWTH_WEIGHT_LOW_INFO',
          severity: FlagSeverity.INFO,
          message: `Weight ${data.weightKg} kg at ${data.ageMonths} months — needs clinical review`,
          ruleDescription: 'Weight < 2.5 kg after 1 month of age — REQUIRES CLINICAL VALIDATION. WHO LMS reference tables required for accurate assessment.',
        },
      });
    }
  }

  // ─── Documents ─────────────────────────────────────────────────────────────

  async createMchDocument(actor: MchActor, dto: CreateMchDocumentDto) {
    const patientId = actor.role === 'PATIENT' ? await this.resolvePatientId(actor) : undefined;

    // Verify the medical report belongs to this patient
    const report = await prisma.medicalReport.findUnique({
      where: { id: dto.medicalReportId },
      include: { patient: { select: { userId: true, id: true } } },
    });
    if (!report) throw new NotFoundException('Medical report not found');

    const resolvedPatientId = patientId ?? report.patient.id;
    await this.assertPatientAccess(actor, resolvedPatientId);

    if (report.patient.userId !== (await prisma.patient.findUnique({ where: { id: resolvedPatientId }, select: { userId: true } }))?.userId) {
      throw new ForbiddenException('Medical report does not belong to this patient');
    }

    return prisma.mchDocument.create({
      data: {
        patientId: resolvedPatientId,
        medicalReportId: dto.medicalReportId,
        title: dto.title,
        category: dto.category,
        pregnancyId: dto.pregnancyId,
        childId: dto.childId,
        investigationId: dto.investigationId,
        notes: dto.notes,
      },
    });
  }

  async listMchDocuments(actor: MchActor, options: { patientId?: string; pregnancyId?: string; childId?: string }) {
    const resolvedId = actor.role === 'PATIENT'
      ? await this.resolvePatientId(actor)
      : options.patientId!;
    await this.assertPatientAccess(actor, resolvedId);

    return prisma.mchDocument.findMany({
      where: {
        patientId: resolvedId,
        ...(options.pregnancyId && { pregnancyId: options.pregnancyId }),
        ...(options.childId && { childId: options.childId }),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Overview ──────────────────────────────────────────────────────────────

  async getMchOverview(actor: MchActor, patientId?: string) {
    const resolvedId = actor.role === 'PATIENT' ? await this.resolvePatientId(actor) : patientId!;
    await this.assertPatientAccess(actor, resolvedId);

    const [activePregnancy, children, openFlags] = await Promise.all([
      prisma.pregnancy.findFirst({
        where: { patientId: resolvedId, status: PregnancyStatus.ACTIVE },
        include: { ancVisits: { orderBy: { visitDate: 'desc' }, take: 1 } },
      }),
      prisma.child.findMany({
        where: { patientId: resolvedId },
        include: {
          vaccinationRecords: { where: { status: { in: [VaccinationStatus.DUE, VaccinationStatus.UPCOMING] } }, orderBy: { scheduledDate: 'asc' }, take: 3 },
          growthMeasurements: { orderBy: { measurementDate: 'desc' }, take: 1 },
        },
        orderBy: { dateOfBirth: 'desc' },
      }),
      prisma.mchSafetyFlag.findMany({
        where: {
          status: FlagStatus.OPEN,
          OR: [
            { pregnancy: { is: { patientId: resolvedId } } },
            { child: { is: { patientId: resolvedId } } },
          ],
        },
        orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
        take: 10,
      }),
    ]);

    let pregnancySummary: typeof activePregnancy & { gestationalWeeks: number | null; trimester: 1 | 2 | 3 | null; edd: Date | null } | null = null;
    if (activePregnancy) {
      const today = new Date();
      const gestationalWeeks = activePregnancy.lmpDate ? MchService.calculateGestationalWeeks(activePregnancy.lmpDate, today) : null;
      const trimester = gestationalWeeks !== null ? MchService.calculateTrimester(gestationalWeeks) : null;
      const edd = activePregnancy.eddUltrasound ?? activePregnancy.eddLmp;
      pregnancySummary = { ...activePregnancy, gestationalWeeks, trimester, edd };
    }

    return { activePregnancy: pregnancySummary, children, openFlags };
  }

  // ─── Reminder scheduling ───────────────────────────────────────────────────

  async scheduleVaccinationReminders(patientId: string, childId: string, vaccinationRecordId: string, scheduledDate: Date) {
    const reminderTypes: Array<{ type: MchReminderType; daysOffset: number }> = [
      { type: MchReminderType.VACCINATION_7D, daysOffset: -7 },
      { type: MchReminderType.VACCINATION_3D, daysOffset: -3 },
      { type: MchReminderType.VACCINATION_DUE, daysOffset: 0 },
    ];

    for (const { type, daysOffset } of reminderTypes) {
      const eventDate = new Date(scheduledDate);
      eventDate.setDate(eventDate.getDate() + daysOffset);

      // Idempotent: upsert by unique (vaccinationRecordId, reminderType)
      const existing = await prisma.mchReminder.findFirst({ where: { vaccinationRecordId, reminderType: type } });
      if (existing) continue;

      const reminder = await prisma.mchReminder.create({
        data: { patientId, childId, vaccinationRecordId, reminderType: type, eventDate },
      });

      const delayMs = eventDate.getTime() - Date.now();
      if (delayMs > 0) {
        await this.mchQueue.add('send-mch-reminder', { reminderId: reminder.id, type, patientId, childId }, { delay: delayMs, jobId: `mch-${reminder.id}` });
      }
    }
  }

  async scheduleAncReminders(patientId: string, ancVisitId: string, visitDate: Date) {
    const reminderTypes: Array<{ type: MchReminderType; daysOffset: number }> = [
      { type: MchReminderType.ANC_7D, daysOffset: -7 },
      { type: MchReminderType.ANC_3D, daysOffset: -3 },
      { type: MchReminderType.ANC_DUE, daysOffset: 0 },
    ];

    for (const { type, daysOffset } of reminderTypes) {
      const eventDate = new Date(visitDate);
      eventDate.setDate(eventDate.getDate() + daysOffset);

      const existing = await prisma.mchReminder.findFirst({ where: { ancVisitId, reminderType: type } });
      if (existing) continue;

      const reminder = await prisma.mchReminder.create({
        data: { patientId, ancVisitId, reminderType: type, eventDate },
      });

      const delayMs = eventDate.getTime() - Date.now();
      if (delayMs > 0) {
        await this.mchQueue.add('send-mch-reminder', { reminderId: reminder.id, type, patientId }, { delay: delayMs, jobId: `mch-${reminder.id}` });
      }
    }
  }
}
