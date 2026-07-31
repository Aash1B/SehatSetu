import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(
    email: string,
    password: string,
    fullName: string,
    role: 'PATIENT' | 'DOCTOR',
    dataConsent: boolean,
  ) {
    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role,
        dataConsentGiven: dataConsent,
        dataConsentAt: new Date(),
        ...(role === 'PATIENT' ? { patient: { create: {} } } : {}),
        ...(role === 'DOCTOR'
          ? {
              doctor: {
                create: {
                  name: fullName,
                  specialty: 'General Physician',
                },
              },
            }
          : {}),
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accessToken,
    };
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accessToken,
    };
  }

  async deleteAccount(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        email: `deleted_${userId}@sehatsetu.invalid`,
        passwordHash: 'DELETED',
        fullName: 'Deleted User',
      },
    });
    return { message: 'Account and personal data deleted' };
  }
}
