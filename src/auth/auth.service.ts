import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { randomInt, randomBytes, createHash } from 'crypto';

const OTP_EXPIRY_MINUTES = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  private generateOtp(): string {
    return randomInt(100000, 1000000).toString();
  }

  private async sendOtpEmail(email: string, fullName: string, otp: string) {
    await this.mailService.sendMail(
      email,
      'Verify your SehatSetu account',
      `<p>Hi ${fullName},</p>
       <p>Your SehatSetu verification code is:</p>
       <h2 style="letter-spacing: 4px;">${otp}</h2>
       <p>This code expires in ${OTP_EXPIRY_MINUTES} minutes. If you didn't request this, you can ignore this email.</p>`,
    );
  }

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
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role,
          dataConsentGiven: dataConsent,
          dataConsentAt: new Date(),
          emailVerified: false,
          emailOtpHash: otpHash,
          emailOtpExpiresAt: otpExpiresAt,
        },
      });

      if (role === 'PATIENT') {
        await tx.patient.create({ data: { userId: newUser.id } });
      } else if (role === 'DOCTOR') {
        await tx.doctor.create({ data: { userId: newUser.id, specialty: 'General Physician' } });
      }

      return newUser;
    });

    await this.sendOtpEmail(email, fullName, otp);

    return {
      message: 'Account created. Please check your email for a verification code.',
      email,
    };
  }

  async verifyOtp(email: string, otp: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('No account found with this email');
    }
    if (user.emailVerified) {
      return { message: 'Email already verified. You can log in.' };
    }
    if (!user.emailOtpHash || !user.emailOtpExpiresAt || user.emailOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    const otpMatches = await bcrypt.compare(otp, user.emailOtpHash);
    if (!otpMatches) {
      throw new UnauthorizedException('Invalid OTP');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailOtpHash: null,
        emailOtpExpiresAt: null,
      },
    });

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('No account found with this email');
    }
    if (user.emailVerified) {
      throw new BadRequestException('Email is already verified');
    }

    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { emailOtpHash: otpHash, emailOtpExpiresAt: otpExpiresAt },
    });

    await this.sendOtpEmail(email, user.fullName, otp);

    return { message: 'A new verification code has been sent to your email.' };
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

    if (!user.emailVerified) {
      throw new UnauthorizedException('Please verify your email before logging in. Check your inbox for the verification code.');
    }

    if (user.accountStatus !== 'ACTIVE') throw new UnauthorizedException('This account is no longer active');
    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role, ver: user.tokenVersion });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accessToken,
    };
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = createHash('sha256').update(rawToken).digest('hex');
      const resetTokenExpiresAt = new Date(Date.now() + 30 * 60 * 1000);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { resetTokenHash: tokenHash, resetTokenExpiresAt },
      });

      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}`;

      await this.mailService.sendMail(
        email,
        'Reset your SehatSetu password',
        `<p>Hi ${user.fullName},</p>
         <p>We received a request to reset your SehatSetu password. Click the link below to choose a new one:</p>
         <p><a href="${resetLink}">${resetLink}</a></p>
         <p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`,
      );
    }

    return { message: 'If an account with that email exists, a password reset link has been sent.' };
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: { resetTokenHash: tokenHash },
    });

    if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
      throw new BadRequestException('This reset link is invalid or has expired. Please request a new one.');
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
      },
    });

    return { message: 'Password reset successfully. You can now log in with your new password.' };
  }
}
