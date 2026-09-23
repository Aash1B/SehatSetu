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
import { AshaService } from './asha.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { QuickRegisterPatientDto } from './dto/quick-register-patient.dto';
import { AshaCreateAppointmentDto } from './dto/asha-create-appointment.dto';

@Controller('api/asha')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ASHA')
export class AshaController {
  constructor(private readonly ashaService: AshaService) {}

  @Get('dashboard')
  async getDashboard(@Req() req: any) {
    return this.ashaService.getDashboard(req.user.userId);
  }

  @Get('patients')
  async getPatients(@Req() req: any, @Query('search') search?: string) {
    return this.ashaService.getPatients(req.user.userId, search);
  }

  @Get('patients/:id')
  async getPatientDetail(@Req() req: any, @Param('id') patientId: string) {
    return this.ashaService.getPatientDetail(req.user.userId, patientId);
  }

  @Post('patients/quick-register')
  async quickRegisterPatient(@Req() req: any, @Body() dto: QuickRegisterPatientDto) {
    return this.ashaService.quickRegisterPatient(req.user.userId, dto);
  }

  @Post('appointments')
  async bookAppointment(@Req() req: any, @Body() dto: AshaCreateAppointmentDto) {
    return this.ashaService.bookAppointment(req.user.userId, dto);
  }

  @Get('followups/overdue')
  async getOverdueFollowups(@Req() req: any) {
    return this.ashaService.getOverdueFollowups(req.user.userId);
  }

  @Get('emergencies')
  async getEmergencies(@Req() req: any) {
    return this.ashaService.getEmergencies(req.user.userId);
  }

  @Patch('emergencies/:appointmentId/verify')
  async verifyEmergency(@Req() req: any, @Param('appointmentId') appointmentId: string) {
    return this.ashaService.verifyEmergency(req.user.userId, appointmentId);
  }
}
