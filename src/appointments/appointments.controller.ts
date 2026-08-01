import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

@Controller('api/appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  async createAppointment(@Body() createAppointmentDto: any) {
    return this.appointmentsService.createAppointment(createAppointmentDto);
  }

  @Get('doctor/:doctorId')
  async getAppointmentsForDoctor(@Param('doctorId') doctorId: string) {
    return this.appointmentsService.getAppointmentsForDoctor(doctorId);
  }
}
