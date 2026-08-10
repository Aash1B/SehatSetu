import { Controller, Get, Patch, Query, Param, Body } from '@nestjs/common';
import { SlotsService } from './slots.service';

@Controller('slots')
export class SlotsController {
  constructor(private readonly slotsService: SlotsService) {}

  @Get()
  async getSlots(
    @Query('doctorId') doctorId: string,
    @Query('date') date: string,
  ) {
    return this.slotsService.getSlotsByDoctorAndDate(doctorId, date);
  }

  @Patch(':id/book')
  async bookSlot(
    @Param('id') id: string,
    @Body('appointmentId') appointmentId?: string,
  ) {
    return this.slotsService.bookSlot(id, appointmentId);
  }
}
