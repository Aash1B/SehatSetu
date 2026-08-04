import { Controller, Get, Post, Body, Query, BadRequestException, InternalServerErrorException, Req, UseGuards } from '@nestjs/common';
import { LivekitService } from './livekit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('api/livekit')
export class LivekitController {
  constructor(private readonly livekitService: LivekitService) {}

  @Get('token')
  @UseGuards(JwtAuthGuard)
  async getToken(
    @Query('appointmentId') appointmentId: string,
    @Req() req: any,
  ) {
    if (!appointmentId) {
      throw new BadRequestException('appointmentId query parameter is required');
    }

    const token = await this.livekitService.createTokenForAppointment(
      appointmentId,
      req.user.userId,
      req.user.role,
    );
    const serverUrl = process.env.LIVEKIT_URL;
    if (!serverUrl) {
      throw new InternalServerErrorException('LiveKit server URL is not configured');
    }
    return { token, serverUrl };
  }

  @Post('end-consultation')
  @UseGuards(JwtAuthGuard)
  async endConsultation(@Body() body: { appointmentId: string; notes?: string; durationSeconds?: number; prescription?: any }, @Req() req: any) {
    if (!body.appointmentId) {
      throw new BadRequestException('appointmentId is required');
    }

    const result = await this.livekitService.endConsultation(
      body.appointmentId,
      req.user.userId,
      req.user.role,
      body.notes,
      body.durationSeconds,
      body.prescription,
    );

    return result;
  }
}
