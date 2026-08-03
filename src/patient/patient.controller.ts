import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { PatientService, UpdatePatientProfileDto } from './patient.service';

@Controller('api/patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('PATIENT')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('dashboard')
  getDashboard(@Req() req: any) {
    return this.patientService.getDashboardData(req.user.userId);
  }

  @Patch('profile')
  updateProfile(@Req() req: any, @Body() dto: UpdatePatientProfileDto) {
    return this.patientService.updateProfile(req.user.userId, dto);
  }

  @Post('profile/avatar/upload-intent')
  createAvatarUploadIntent(
    @Req() req: any,
    @Body() body: { fileName?: string; mimeType?: string; fileSizeBytes?: number },
  ) {
    return this.patientService.createAvatarUploadIntent(req.user.userId, body);
  }

  @Post('profile/avatar/:uploadId/complete')
  completeAvatarUpload(
    @Req() req: any,
    @Param('uploadId') uploadId: string,
    @Body() body: { path?: string },
  ) {
    return this.patientService.completeAvatarUpload(req.user.userId, uploadId, body.path);
  }
}
