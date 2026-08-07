import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  async getDoctors() {
    return this.doctorsService.findAll();
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyProfile(@Req() req: any) {
    return this.doctorsService.findForUser(req.user.userId, req.user.role);
  }

  @Post('recommend')
  async recommendDoctors(@Body() body: { issue?: string; symptoms?: string[] }) {
    return this.doctorsService.recommendDoctors(body.issue || '', body.symptoms || []);
  }
}
