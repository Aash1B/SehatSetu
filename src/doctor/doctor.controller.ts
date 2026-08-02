import { Controller, Get, Put, Post, Param, Body, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DoctorService } from './doctor.service';

@Controller('api/doctor')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Get(':id/availability')
  async getAvailability(@Param('id') doctorId: string) {
    return this.doctorService.getAvailability(doctorId);
  }

  @Put(':id/availability')
  async updateAvailability(
    @Param('id') doctorId: string,
    @Body() availability: any,
  ) {
    const updatedDoctor = await this.doctorService.updateAvailability(doctorId, availability);
    return updatedDoctor;
  }

  @Get(':id/profile')
  async getProfile(@Param('id') doctorId: string) {
    return this.doctorService.getProfile(doctorId);
  }

  @Put(':id/profile')
  async updateProfile(
    @Param('id') doctorId: string,
    @Body() profileData: any,
  ) {
    return this.doctorService.updateProfile(doctorId, profileData);
  }

  @Post(':id/onboarding')
  async saveOnboarding(
    @Param('id') doctorId: string,
    @Body() onboardingData: any,
  ) {
    return this.doctorService.saveOnboardingProfile(doctorId, onboardingData);
  }

  @Post(':id/documents/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') doctorId: string,
    @UploadedFile() file: any,
    @Body('documentType') documentType: string,
  ) {
    const docType = documentType || 'verification-document';
    
    // If no file binary sent (e.g. simulated upload from frontend), generate document metadata
    if (!file) {
      return this.doctorService.uploadDocumentToSupabase(
        {
          buffer: Buffer.from('SIMULATED_MEDICAL_DOCUMENT_CONTENT'),
          originalname: `${docType}.pdf`,
          mimetype: 'application/pdf',
          size: 204800,
        },
        docType,
        doctorId,
      );
    }

    return this.doctorService.uploadDocumentToSupabase(file, docType, doctorId);
  }
}
