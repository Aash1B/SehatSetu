import { Controller, Get, Post, Body, Query, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { LivekitService } from './livekit.service';

@Controller('api/livekit')
export class LivekitController {
  constructor(private readonly livekitService: LivekitService) {}

  @Get('token')
  async getToken(
    @Query('room') room: string,
    @Query('username') username: string,
  ) {
    if (!room || !username) {
      throw new BadRequestException('room and username query parameters are required');
    }

    const token = await this.livekitService.createToken(room, username);
    const serverUrl = process.env.LIVEKIT_URL;
    if (!serverUrl) {
      throw new InternalServerErrorException('LiveKit server URL is not configured');
    }
    return { token, serverUrl };
  }

  @Post('end-consultation')
  async endConsultation(@Body() body: { appointmentId: string; notes?: string; durationSeconds?: number }) {
    if (!body.appointmentId) {
      throw new BadRequestException('appointmentId is required');
    }

    const result = await this.livekitService.enqueueConsultationEnd(
      body.appointmentId,
      body.notes,
      body.durationSeconds,
    );

    return result;
  }
}
