import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import { CreateReferralDto } from './dto/create-referral.dto';
import { UpdateReferralStatusDto } from './dto/update-referral-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller(['api/referrals', 'referrals'])
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @Roles('DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async createReferral(@Req() req: any, @Body() dto: CreateReferralDto) {
    return this.referralsService.createReferral(dto, req.user?.userId);
  }

  @Patch(':id/status')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateReferralStatusDto,
  ) {
    return this.referralsService.updateStatus(id, dto);
  }

  @Get('patient/:patientId')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getPatientReferrals(@Param('patientId') patientId: string) {
    return this.referralsService.getPatientReferrals(patientId);
  }

  @Get(':id')
  @Roles('PATIENT', 'DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getReferralById(@Param('id') id: string) {
    return this.referralsService.getReferralById(id);
  }

  @Get()
  @Roles('DOCTOR', 'ASHA', 'FACILITY_ADMIN')
  async getReferrals(
    @Query('status') status?: string,
    @Query('facilityType') facilityType?: string,
    @Query('limit') limit?: number,
  ) {
    return this.referralsService.getReferrals({ status, facilityType, limit });
  }
}
