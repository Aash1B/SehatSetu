import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AccessToken } from 'livekit-server-sdk';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

@Injectable()
export class LivekitService {
  constructor(
    @InjectQueue('consultation-queue') private readonly consultationQueue: Queue,
  ) {}

  async createToken(roomName: string, participantName: string): Promise<string> {
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new InternalServerErrorException('LiveKit credentials are not configured');
    }

    const at = new AccessToken(apiKey, apiSecret, {
      identity: participantName,
      name: participantName,
    });

    at.addGrant({ roomJoin: true, room: roomName });
    
    return await at.toJwt();
  }

  async enqueueConsultationEnd(appointmentId: string, notes?: string, durationSeconds?: number) {
    try {
      const job = await this.consultationQueue.add('process-consultation-end', {
        appointmentId,
        notes,
        durationSeconds: durationSeconds || 900,
      });

      console.log(`[BullMQ] Enqueued post-consultation job for appointment ${appointmentId} (Job ID: ${job.id})`);

      return {
        success: true,
        message: `Consultation end job enqueued for background AI summary processing.`,
        jobId: job.id,
      };
    } catch (error: any) {
      console.warn('[BullMQ Warning] Could not enqueue consultation end job:', error?.message || error);
      return {
        success: false,
        message: 'Could not enqueue background job (Redis offline or unavailable).',
      };
    }
  }
}
