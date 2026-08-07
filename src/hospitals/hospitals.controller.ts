import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { NearbyHospitalsDto } from './dto/nearby-hospitals.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('hospitals')
export class HospitalsController {
  constructor(private readonly hospitalsService: HospitalsService) {}

  @Get('nearby')
  @UseGuards(JwtAuthGuard)
  findNearby(@Query() query: NearbyHospitalsDto) {
    return this.hospitalsService.findNearby(query.lat, query.lng, query.radiusMeters ?? 5000);
  }
}