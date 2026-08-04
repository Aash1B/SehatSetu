import { Injectable, ForbiddenException, ConflictException } from '@nestjs/common';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AbdmService {
  constructor(private readonly prisma: PrismaService) {}

  private generateMockAbhaId(): string {
    const segment = () => randomInt(1000, 10000).toString();
    return `${randomInt(10, 100)}-${segment()}-${segment()}-${segment()}`;
  }

  async createAbhaId(requestingUserId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId: requestingUserId } });
    if (!patient) {
      throw new ForbiddenException('Only patients can create an ABHA ID');
    }

    if (patient.abhaId) {
      throw new ConflictException('This patient already has an ABHA ID');
    }

    const abhaId = await this.prisma.patient.update({
      where: { id: patient.id },
      data: { abhaId: this.generateMockAbhaId() },
      select: { abhaId: true },
    });

    return {
      message: 'ABHA ID created (mock — not a real government-issued ID)',
      abhaId: abhaId.abhaId,
    };
  }

  async getAbhaStatus(requestingUserId: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId: requestingUserId } });
    if (!patient) {
      throw new ForbiddenException('Only patients have an ABHA ID');
    }

    return {
      hasAbhaId: !!patient.abhaId,
      abhaId: patient.abhaId,
    };
  }
}