import { Controller, Post, Get, Req, UseGuards } from '@nestjs/common';
import { AbdmService } from './abdm.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('abdm')
@UseGuards(JwtAuthGuard)
export class AbdmController {
  constructor(private readonly abdmService: AbdmService) {}

  @Post('abha')
  createAbhaId(@Req() req: any) {
    return this.abdmService.createAbhaId(req.user.userId);
  }

  @Get('abha')
  getAbhaStatus(@Req() req: any) {
    return this.abdmService.getAbhaStatus(req.user.userId);
  }
}