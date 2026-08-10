import { BadRequestException, Controller, Get, Put, Post, Param, Body, UseInterceptors, UploadedFile, UseGuards, Req, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { DoctorService } from './doctor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('api/doctor')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get('approve')
  async approveDoctor(@Query('token') token: string, @Res() res: Response) {
    const html = await this.doctorService.approveDoctor(token);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  @Get('reject')
  async rejectDoctor(
    @Query('token') token: string,
    @Query('reason') reason: string,
    @Res() res: Response,
  ) {
    const html = await this.doctorService.rejectDoctor(token, reason);
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);
  }

  @Get(':id/availability')
  async getAvailability(@Param('id') doctorId: string) {
    return this.doctorService.getAvailability(doctorId);
  }

  @Put(':id/availability')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  async updateAvailability(
    @Body() availability: any,
    @Req() req: any,
  ) {
    const updatedDoctor = await this.doctorService.updateAvailability(req.user.userId, availability);
    return updatedDoctor;
  }

  @Get(':id/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  async getProfile(@Req() req: any) {
    return this.doctorService.getProfile(req.user.userId);
  }

  @Put(':id/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  async updateProfile(
    @Body() profileData: any,
    @Req() req: any,
  ) {
    return this.doctorService.updateProfile(req.user.userId, profileData);
  }

  @Post(':id/onboarding')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  async saveOnboarding(
    @Body() onboardingData: any,
    @Req() req: any,
  ) {
    return this.doctorService.saveOnboardingProfile(req.user.userId, onboardingData);
  }

  @Post(':id/profile-image')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async uploadProfileImage(
    @UploadedFile() file: any,
    @Req() req: any,
  ) {
    if (!file) throw new BadRequestException('Profile image file is required');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP image formats are allowed');
    }
    return this.doctorService.uploadProfileImageToSupabase(file, req.user.userId);
  }

  @Post(':id/documents/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('DOCTOR')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async uploadDocument(
    @UploadedFile() file: any,
    @Body('documentType') documentType: string,
    @Req() req: any,
  ) {
    const docType = documentType || 'verification-document';
    if (!file) throw new BadRequestException('A verification document file is required');
    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPEG, PNG, and WebP documents are allowed');
    }

    return this.doctorService.uploadDocumentToSupabase(file, docType, req.user.userId);
  }
}
