import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

async signup(
  email: string,
  password: string,
  fullName: string,
  role: 'PATIENT' | 'DOCTOR',
  dataConsent: boolean,
) {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictException('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      role,
      dataConsentGiven: dataConsent,
      dataConsentAt: new Date(),
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
    const user = await prisma.user.findUnique({ where: { email } });
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
  await prisma.user.update({
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
