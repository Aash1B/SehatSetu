import {
  Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MchService, MchActor } from './mch.service';
import { CreatePregnancyDto, UpdatePregnancyDto } from './dto/pregnancy.dto';
import { CreateAncVisitDto, UpdateAncVisitDto, VerifyAncVisitDto } from './dto/anc-visit.dto';
import { CreateInvestigationDto, UpdateInvestigationDto, VerifyInvestigationDto } from './dto/investigation.dto';
import { CreateChildDto, UpdateChildDto } from './dto/child.dto';
import { AddVaccinationDto, RecordVaccinationDto, VerifyVaccinationDto } from './dto/vaccination.dto';
import { CreateGrowthMeasurementDto, VerifyGrowthDto } from './dto/growth.dto';
import { UpdateMilestoneDto, DoctorReviewMilestoneDto } from './dto/milestone.dto';
import { ReviewFlagDto } from './dto/safety-flag.dto';
import { CreateMchDocumentDto } from './dto/document.dto';

function actor(req: any): MchActor {
  return { userId: req.user.userId, role: req.user.role };
}

@Controller('api/mch')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MchController {
  constructor(private readonly mch: MchService) {}

  // ── Overview ────────────────────────────────────────────────────────────────
  @Get('overview')
  @Roles('PATIENT', 'DOCTOR')
  getOverview(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.mch.getMchOverview(actor(req), patientId);
  }

  // ── Pregnancies ─────────────────────────────────────────────────────────────
  @Post('pregnancies')
  @Roles('PATIENT')
  createPregnancy(@Req() req: any, @Body() dto: CreatePregnancyDto) {
    return this.mch.createPregnancy(actor(req), dto);
  }

  @Get('pregnancies')
  @Roles('PATIENT', 'DOCTOR')
  listPregnancies(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.mch.listPregnancies(actor(req), patientId);
  }

  @Get('pregnancies/:id')
  @Roles('PATIENT', 'DOCTOR')
  getPregnancy(@Req() req: any, @Param('id') id: string) {
    return this.mch.getPregnancy(actor(req), id);
  }

  @Patch('pregnancies/:id')
  @Roles('PATIENT', 'DOCTOR')
  updatePregnancy(@Req() req: any, @Param('id') id: string, @Body() dto: UpdatePregnancyDto) {
    return this.mch.updatePregnancy(actor(req), id, dto);
  }

  // ── ANC Visits ──────────────────────────────────────────────────────────────
  @Post('pregnancies/:pregnancyId/anc-visits')
  @Roles('PATIENT', 'DOCTOR')
  createAncVisit(@Req() req: any, @Param('pregnancyId') pregnancyId: string, @Body() dto: CreateAncVisitDto) {
    return this.mch.createAncVisit(actor(req), pregnancyId, dto);
  }

  @Get('pregnancies/:pregnancyId/anc-visits')
  @Roles('PATIENT', 'DOCTOR')
  listAncVisits(@Req() req: any, @Param('pregnancyId') pregnancyId: string) {
    return this.mch.listAncVisits(actor(req), pregnancyId);
  }

  @Patch('anc-visits/:id')
  @Roles('PATIENT', 'DOCTOR')
  updateAncVisit(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAncVisitDto) {
    return this.mch.updateAncVisit(actor(req), id, dto);
  }

  @Put('anc-visits/:id/verify')
  @Roles('DOCTOR')
  verifyAncVisit(@Req() req: any, @Param('id') id: string, @Body() dto: VerifyAncVisitDto) {
    return this.mch.verifyAncVisit(actor(req), id, dto);
  }

  // ── Investigations ──────────────────────────────────────────────────────────
  @Post('pregnancies/:pregnancyId/investigations')
  @Roles('PATIENT', 'DOCTOR')
  createInvestigation(@Req() req: any, @Param('pregnancyId') pregnancyId: string, @Body() dto: CreateInvestigationDto) {
    return this.mch.createInvestigation(actor(req), pregnancyId, dto);
  }

  @Get('pregnancies/:pregnancyId/investigations')
  @Roles('PATIENT', 'DOCTOR')
  listInvestigations(@Req() req: any, @Param('pregnancyId') pregnancyId: string) {
    return this.mch.listInvestigations(actor(req), pregnancyId);
  }

  @Patch('investigations/:id')
  @Roles('PATIENT', 'DOCTOR')
  updateInvestigation(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateInvestigationDto) {
    return this.mch.updateInvestigation(actor(req), id, dto);
  }

  @Put('investigations/:id/verify')
  @Roles('DOCTOR')
  verifyInvestigation(@Req() req: any, @Param('id') id: string, @Body() dto: VerifyInvestigationDto) {
    return this.mch.verifyInvestigation(actor(req), id, dto);
  }

  // ── Children ────────────────────────────────────────────────────────────────
  @Post('children')
  @Roles('PATIENT')
  createChild(@Req() req: any, @Body() dto: CreateChildDto) {
    return this.mch.createChild(actor(req), dto);
  }

  @Get('children')
  @Roles('PATIENT', 'DOCTOR')
  listChildren(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.mch.listChildren(actor(req), patientId);
  }

  @Get('children/:id')
  @Roles('PATIENT', 'DOCTOR')
  getChild(@Req() req: any, @Param('id') id: string) {
    return this.mch.getChild(actor(req), id);
  }

  @Patch('children/:id')
  @Roles('PATIENT', 'DOCTOR')
  updateChild(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateChildDto) {
    return this.mch.updateChild(actor(req), id, dto);
  }

  // ── Vaccinations ────────────────────────────────────────────────────────────
  @Get('children/:childId/vaccinations')
  @Roles('PATIENT', 'DOCTOR')
  listVaccinations(@Req() req: any, @Param('childId') childId: string) {
    return this.mch.listVaccinations(actor(req), childId);
  }

  @Post('children/:childId/vaccinations')
  @Roles('PATIENT', 'DOCTOR')
  addVaccination(@Req() req: any, @Param('childId') childId: string, @Body() dto: AddVaccinationDto) {
    return this.mch.addVaccination(actor(req), childId, dto);
  }

  @Put('vaccinations/:id/record')
  @Roles('PATIENT', 'DOCTOR')
  recordVaccination(@Req() req: any, @Param('id') id: string, @Body() dto: RecordVaccinationDto) {
    return this.mch.recordVaccination(actor(req), id, dto);
  }

  @Put('vaccinations/:id/verify')
  @Roles('DOCTOR')
  verifyVaccination(@Req() req: any, @Param('id') id: string, @Body() dto: VerifyVaccinationDto) {
    return this.mch.verifyVaccination(actor(req), id, dto);
  }

  // ── Growth ──────────────────────────────────────────────────────────────────
  @Post('children/:childId/growth')
  @Roles('PATIENT', 'DOCTOR')
  createGrowth(@Req() req: any, @Param('childId') childId: string, @Body() dto: CreateGrowthMeasurementDto) {
    return this.mch.createGrowthMeasurement(actor(req), childId, dto);
  }

  @Get('children/:childId/growth')
  @Roles('PATIENT', 'DOCTOR')
  listGrowth(@Req() req: any, @Param('childId') childId: string) {
    return this.mch.listGrowthMeasurements(actor(req), childId);
  }

  @Put('growth/:id/verify')
  @Roles('DOCTOR')
  verifyGrowth(@Req() req: any, @Param('id') id: string, @Body() dto: VerifyGrowthDto) {
    return this.mch.verifyGrowthMeasurement(actor(req), id, dto);
  }

  // ── Milestones ──────────────────────────────────────────────────────────────
  @Get('children/:childId/milestones')
  @Roles('PATIENT', 'DOCTOR')
  listMilestones(@Req() req: any, @Param('childId') childId: string) {
    return this.mch.listMilestones(actor(req), childId);
  }

  @Patch('milestones/:id')
  @Roles('PATIENT', 'DOCTOR')
  updateMilestone(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.mch.updateMilestone(actor(req), id, dto);
  }

  @Put('milestones/:id/doctor-review')
  @Roles('DOCTOR')
  doctorReviewMilestone(@Req() req: any, @Param('id') id: string, @Body() dto: DoctorReviewMilestoneDto) {
    return this.mch.doctorReviewMilestone(actor(req), id, dto);
  }

  // ── Safety Flags ─────────────────────────────────────────────────────────────
  @Get('safety-flags')
  @Roles('PATIENT', 'DOCTOR')
  listFlags(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.mch.listSafetyFlags(actor(req), patientId);
  }

  @Put('safety-flags/:id/review')
  @Roles('DOCTOR')
  reviewFlag(@Req() req: any, @Param('id') id: string, @Body() dto: ReviewFlagDto) {
    return this.mch.reviewFlag(actor(req), id, dto);
  }

  // ── Documents ────────────────────────────────────────────────────────────────
  @Post('documents')
  @Roles('PATIENT', 'DOCTOR')
  createDocument(@Req() req: any, @Body() dto: CreateMchDocumentDto) {
    return this.mch.createMchDocument(actor(req), dto);
  }

  @Get('documents')
  @Roles('PATIENT', 'DOCTOR')
  listDocuments(
    @Req() req: any,
    @Query('patientId') patientId?: string,
    @Query('pregnancyId') pregnancyId?: string,
    @Query('childId') childId?: string,
  ) {
    return this.mch.listMchDocuments(actor(req), { patientId, pregnancyId, childId });
  }
}
