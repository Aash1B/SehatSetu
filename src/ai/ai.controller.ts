import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AiService } from './ai.service';

const ENDPOINTS: Record<string, string> = {
  summarize: 'summarize',
  summary: 'generate-summary',
  prescription: 'generate-prescription',
  diet: 'diet-recommendation',
  specialist: 'recommend-doctor',
  medicalInfo: 'extract-medical-info',
  cleanup: 'clean-transcript',
  liveChunk: 'live-transcription/chunk',
};

@Controller('api/ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post(':endpoint')
  proxy(@Param('endpoint') endpoint: string, @Body() body: unknown) {
    const path = ENDPOINTS[endpoint];
    if (!path) {
      return { error: { code: 'AI_ENDPOINT_NOT_ALLOWED', message: 'Unsupported AI operation' } };
    }
    return this.aiService.post(path, body);
  }
}
