import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UploadIntentDto } from './dto/upload-intent.dto';
import { ListMedicalReportsDto } from './dto/list-medical-reports.dto';
import { MedicalReportsService } from './medical-reports.service';
import { AuthenticatedActor } from './medical-reports.types';

@Controller('api/medical-reports')
@UseGuards(JwtAuthGuard)
export class MedicalReportsController {
  constructor(private readonly medicalReports: MedicalReportsService) {}

  @Post('upload-intent')
  createUploadIntent(
    @Body() dto: UploadIntentDto,
    @Req() request: { user: AuthenticatedActor },
  ) {
    return this.medicalReports.createUploadIntent(dto, request.user);
  }

  @Get('me/context')
  getPatientContext(@Req() request: { user: AuthenticatedActor }) {
    return this.medicalReports.getPatientContext(request.user);
  }

  @Post(':reportId/upload-complete')
  completeUpload(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Req() request: { user: AuthenticatedActor },
  ) {
    return this.medicalReports.completeUpload(reportId, request.user);
  }

  @Get()
  list(
    @Query() query: ListMedicalReportsDto,
    @Req() request: { user: AuthenticatedActor },
  ) {
    return this.medicalReports.list(request.user, query.patientId);
  }

  @Get(':reportId')
  get(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Req() request: { user: AuthenticatedActor },
  ) {
    return this.medicalReports.get(reportId, request.user);
  }

  @Post(':reportId/process')
  process(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Req() request: { user: AuthenticatedActor },
  ) {
    return this.medicalReports.process(reportId, request.user);
  }

  @Post(':reportId/download-url')
  createDownloadUrl(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Req() request: { user: AuthenticatedActor },
  ) {
    return this.medicalReports.createDownloadUrl(reportId, request.user);
  }

  @Delete(':reportId')
  remove(
    @Param('reportId', ParseUUIDPipe) reportId: string,
    @Req() request: { user: AuthenticatedActor },
  ) {
    return this.medicalReports.remove(reportId, request.user);
  }
}
