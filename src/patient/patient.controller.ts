import { Controller, Get, Put, Body, Query } from '@nestjs/common';
import { PatientService, UpdatePatientProfileDto } from './patient.service';

@Controller('api/patient')
export class PatientController {
  constructor(private readonly patientService: PatientService) {}

  @Get('profile')
  async getProfile(@Query('userId') userId: string) {
    return this.patientService.getProfile(userId);
  }

  @Put('profile')
  async updateProfile(
    @Query('userId') userId: string,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientService.updateProfile(userId, dto);
  }

  @Get('dashboard')
  async getDashboard(@Query('userId') userId: string) {
    return this.patientService.getDashboardData(userId);
  }
}
