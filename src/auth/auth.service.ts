import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
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

  const user = await this.prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role,
        dataConsentGiven: dataConsent,
        dataConsentAt: new Date(),
      },
    });

    if (role === 'PATIENT') {
      await tx.patient.create({ data: { userId: newUser.id } });
    } else if (role === 'DOCTOR') {
      await tx.doctor.create({ data: { userId: newUser.id, specialty: 'General Physician' } });
    }

    return newUser;
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