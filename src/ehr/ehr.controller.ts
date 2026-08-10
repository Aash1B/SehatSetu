import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { EhrService } from './ehr.service';
import { CreateEhrRecordDto } from './dto/create-ehr-record.dto';
import { AiSummaryDto } from './dto/ai-summary.dto';
import { RejectEhrDraftDto } from './dto/reject-ehr-draft.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiKeyGuard } from './api-key.guard';

@Controller('ehr')
export class EhrController {
  constructor(private readonly ehrService: EhrService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  createRecord(@Body() dto: CreateEhrRecordDto, @Req() req: any) {
    return this.ehrService.createRecord(dto, req.user.userId);
  }

  @Get('patient/:patientId')
  @UseGuards(JwtAuthGuard)
  getPatientHistory(@Param('patientId') patientId: string, @Req() req: any) {
    return this.ehrService.getPatientHistory(patientId, req.user.userId, req.user.role);
  }

  @Post(':id/summary')
  @UseGuards(ApiKeyGuard)
  attachAiSummary(@Param('id') id: string, @Body() dto: AiSummaryDto) {
    return this.ehrService.attachAiSummary(id, dto.summary);
  }

  @Get('drafts/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  listPendingDrafts(@Req() req: any) {
    return this.ehrService.listPendingDrafts(req.user.userId, req.user.role);
  }

  @Get('drafts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  getDraftForReview(@Param('id') id: string, @Req() req: any) {
    return this.ehrService.getDraftForReview(id, req.user.userId, req.user.role);
  }

  @Put('drafts/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  approveDraft(@Param('id') id: string, @Req() req: any) {
    return this.ehrService.approveDraft(id, req.user.userId, req.user.role);
  }

  @Put('drafts/:id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  rejectDraft(@Param('id') id: string, @Body() dto: RejectEhrDraftDto, @Req() req: any) {
    return this.ehrService.rejectDraft(id, dto.reason, req.user.userId, req.user.role);
  }
}