import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { DoctorsService } from './doctors.service';

@Controller('api/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async getAllDoctors() {
    return this.doctorsService.findAll();
  }

  @Post('recommend')
  async recommendDoctors(@Body() body: { issue?: string; symptoms?: string[] }) {
    return this.doctorsService.recommendDoctors(body.issue || '', body.symptoms || []);
  }

  @Get(':id')
  async getDoctorById(@Param('id') id: string) {
    return this.doctorsService.findOne(id);
  }
}
