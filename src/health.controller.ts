import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return {
      service: 'sehat-setu-api',
      status: 'running',
      health: '/health',
    };
  }

  @Get('health')
  health() {
    return { status: 'healthy', service: 'sehat-setu-api' };
  }
}
