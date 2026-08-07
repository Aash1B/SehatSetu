import { Controller, Post, Get, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createAppointment(@Body() createAppointmentDto: any, @Req() req: any) {
    return this.appointmentsService.createAppointment(createAppointmentDto, req.user.userId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllAppointments(@Req() req: any) {
    return this.appointmentsService.getAppointmentsForUser(req.user.userId, req.user.role);
  }

  @Get(':appointmentId')
  @UseGuards(JwtAuthGuard)
  async getAppointment(@Param('appointmentId') appointmentId: string, @Req() req: any) {
    return this.appointmentsService.getAppointmentForUser(appointmentId, req.user.userId, req.user.role);
  }

  @Patch(':appointmentId/reschedule')
  @UseGuards(JwtAuthGuard)
  async rescheduleAppointment(@Param('appointmentId') appointmentId: string, @Body() body: any, @Req() req: any) {
    return this.appointmentsService.rescheduleAppointment(appointmentId, body, req.user.userId, req.user.role);
  }

  @Get('doctor/:doctorId')
  async getAppointmentsForDoctor(@Param('doctorId') doctorId: string) {
    return this.appointmentsService.getAppointmentsForDoctor(doctorId);
  }
}
