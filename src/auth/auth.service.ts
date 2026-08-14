import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { OAuth2Client } from 'google-auth-library';
import { randomInt, randomBytes, createHash } from 'crypto';

const OTP_EXPIRY_MINUTES = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) { }

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
        await tx.doctor.create({
          data: {
            userId: newUser.id,
            specialty: 'General Physician',
            name: fullName.startsWith('Dr.') ? fullName : `Dr. ${fullName}`,
            availableToday: true,
            priorityLevel: 'P1',
            priorityScore: 150,
            rating: 5.0,
            reviewsCount: 0,
            fee: '₹500',
            consultationFee: 500,
            hospital: null,
            experience: null,
            degrees: null,
            profileCompleted: false,
            location: 'India',
            imageUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400',
            tags: ['English', 'Hindi'],
          },
        });
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

    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailOtpHash: null,
        emailOtpExpiresAt: null,
      },
      include: { doctor: true, patient: true },
    });

    const authPayload = this.buildAuthResponse(updatedUser);

    return {
      message: 'Email verified successfully.',
      ...authPayload,
    };
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
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { doctor: true, patient: true },
    });
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

    // Doctor Verification Status Gate
    if (user.role === 'DOCTOR' && user.doctor) {
      const isProfileCompleted = user.doctor.profileCompleted;

      // If doctor hasn't submitted their onboarding & verification documents yet, allow them to log in to complete onboarding
      if (!isProfileCompleted) {
        return this.buildAuthResponse(user);
      }

      const vStatus = user.doctor.verificationStatus || (user.doctor.isVerified ? 'APPROVED' : 'PENDING');
      if (vStatus === 'PENDING') {
        return {
          status: 'PENDING',
          message: 'Your registration is currently under verification by SehatSetu.',
        };
      }
      if (vStatus === 'REJECTED') {
        return {
          status: 'REJECTED',
          message: 'Your doctor registration has been rejected by administrator.',
          rejectionReason: user.doctor.rejectionReason || null,
        };
      }
    }

    return this.buildAuthResponse(user);
  }

  async googleLogin(credential: string, role: 'PATIENT' | 'DOCTOR', dataConsent?: boolean) {
    if (dataConsent === false) {
      throw new BadRequestException('You must consent to data processing to create an account.');
    }

    const payload = await this.verifyGoogleCredential(credential);
    const email = payload.email?.trim().toLowerCase();
    const googleId = payload.sub;
    const fullName = payload.name?.trim() || email?.split('@')[0] || 'Google User';
    const avatarUrl = payload.picture?.trim() || null;

    if (!email) {
      throw new BadRequestException('Google account email is required');
    }

    if (payload.email_verified !== true) {
      throw new UnauthorizedException('Your Google account email is not verified');
    }

    const existingByGoogleId = await this.findUserByGoogleId(googleId);

    if (existingByGoogleId) {
      if (existingByGoogleId.role !== role) {
        throw new ConflictException(this.roleMismatchMessage(existingByGoogleId.role));
      }

      if (existingByGoogleId.accountStatus !== 'ACTIVE') {
        throw new UnauthorizedException('This account is no longer active');
      }

      const refreshedUser = await this.prisma.user.update({
        where: { id: existingByGoogleId.id },
        data: {
          authProvider: 'GOOGLE',
          avatarUrl: avatarUrl ?? existingByGoogleId.avatarUrl,
        },
        include: { doctor: true, patient: true },
      });

      return this.buildAuthResponse(refreshedUser);
    }

    const existingByEmail = await this.prisma.user.findUnique({
      where: { email },
      include: { doctor: true, patient: true },
    });

    if (existingByEmail) {
      if (existingByEmail.role !== role) {
        throw new ConflictException(this.roleMismatchMessage(existingByEmail.role));
      }

      if (existingByEmail.accountStatus !== 'ACTIVE') {
        throw new UnauthorizedException('This account is no longer active');
      }

      const linkedUser = await this.prisma.$transaction(async (tx) => {
        const existingAvatarUrl = (existingByEmail as { avatarUrl?: string | null }).avatarUrl ?? null;
        const updatedUser = await tx.user.update({
          where: { id: existingByEmail.id },
          data: {
            googleId,
            authProvider: 'GOOGLE',
            avatarUrl: avatarUrl ?? existingAvatarUrl,
            emailVerified: true,
            emailOtpHash: null,
            emailOtpExpiresAt: null,
          },
          include: { doctor: true, patient: true },
        });

        if (role === 'PATIENT' && !updatedUser.patient) {
          await tx.patient.create({ data: { userId: updatedUser.id } });
        }

        if (role === 'DOCTOR' && !updatedUser.doctor) {
          await tx.doctor.create({ data: { userId: updatedUser.id, specialty: 'General Physician' } });
        }

        return tx.user.findUniqueOrThrow({
          where: { id: updatedUser.id },
          include: { doctor: true, patient: true },
        });
      });

      return this.buildAuthResponse(linkedUser);
    }

    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);

    const createdUser = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          role,
          dataConsentGiven: dataConsent ?? true,
          dataConsentAt: new Date(),
          emailVerified: true,
          googleId,
          avatarUrl,
          authProvider: 'GOOGLE',
        },
        include: { doctor: true, patient: true },
      });

      if (role === 'PATIENT') {
        await tx.patient.create({ data: { userId: newUser.id } });
      } else {
        await tx.doctor.create({ data: { userId: newUser.id, specialty: 'General Physician' } });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: newUser.id },
        include: { doctor: true, patient: true },
      });
    });

    return this.buildAuthResponse(createdUser);
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

      const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
      const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

      try {
        await this.mailService.sendMail(
          email,
          'Reset your SehatSetu password',
          `<p>Hi ${user.fullName},</p>
           <p>We received a request to reset your SehatSetu password. Click the link below to choose a new one:</p>
           <p><a href="${resetLink}">${resetLink}</a></p>
           <p>This link expires in 30 minutes. If you didn't request this, you can ignore this email.</p>`,
        );
      } catch (error) {
        const details = error instanceof Error ? error.message : String(error);
        this.logger.error(`Password reset email failed for user ${user.id}: ${details}`);

        // Do not leave a usable token behind when delivery failed. The hash
        // condition prevents this cleanup from clearing a newer request.
        await this.prisma.user.updateMany({
          where: { id: user.id, resetTokenHash: tokenHash },
          data: { resetTokenHash: null, resetTokenExpiresAt: null },
        });

        throw new InternalServerErrorException(
          'Password reset email could not be sent. Please try again later.',
        );
      }
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

  // Phone Number Authentication
  async sendPhoneOtp(phoneNumber: string, role: 'PATIENT' | 'DOCTOR') {
    // Store OTP in database with phone number
    const otp = this.generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const otpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Check if user exists with this phone number
    let user = await this.prisma.user.findFirst({
      where: {
        phone: phoneNumber,
        role,
      },
    });

    if (!user) {
      // Create a temporary user record to store OTP
      user = await this.prisma.user.create({
        data: {
          email: `${phoneNumber}@temp.phone.user`,
          passwordHash: await bcrypt.hash(randomBytes(32).toString('hex'), 10),
          fullName: 'Phone User',
          phone: phoneNumber,
          role,
          emailVerified: true, // Phone verification will be primary
          phoneOtpHash: otpHash,
          phoneOtpExpiresAt: otpExpiresAt,
          dataConsentGiven: false, // Will be set during signup
        },
      });
    } else {
      // Update existing user with new OTP
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          phoneOtpHash: otpHash,
          phoneOtpExpiresAt: otpExpiresAt,
        },
      });
    }

    // TODO: Send OTP via SMS service (Twilio, AWS SNS, etc.)
    // For now, log it for development
    console.log(`[DEV] OTP for ${phoneNumber}: ${otp}`);

    return {
      message: 'OTP sent to your phone number',
      ...(process.env.NODE_ENV !== 'production' ? { devOtp: otp } : {}),
    };
  }

  async verifyPhoneOtp(phoneNumber: string, otp: string, role: 'PATIENT' | 'DOCTOR') {
    const user = await this.prisma.user.findFirst({
      where: {
        phone: phoneNumber,
        role,
      },
      include: { doctor: true, patient: true },
    });

    if (!user) {
      throw new NotFoundException('No account found with this phone number');
    }

    if (!user.phoneOtpHash || !user.phoneOtpExpiresAt || user.phoneOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    const otpMatches = await bcrypt.compare(otp, user.phoneOtpHash);
    if (!otpMatches) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Clear OTP after successful verification
    const updatedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        phoneOtpHash: null,
        phoneOtpExpiresAt: null,
        phoneVerified: true,
      },
      include: { doctor: true, patient: true },
    });

    // Check if this is a temporary user (not fully registered)
    if (updatedUser.email.endsWith('@temp.phone.user')) {
      throw new NotFoundException('Please complete your registration with your full name');
    }

    if (updatedUser.accountStatus !== 'ACTIVE') {
      throw new UnauthorizedException('This account is no longer active');
    }

    return this.buildAuthResponse(updatedUser);
  }

  async phoneSignup(
    phoneNumber: string,
    otp: string,
    fullName: string,
    role: 'PATIENT',
    dataConsent: boolean,
  ) {
    if (!dataConsent) {
      throw new BadRequestException('You must consent to data processing to create an account.');
    }

    // Find temporary user or existing user
    let user = await this.prisma.user.findFirst({
      where: {
        phone: phoneNumber,
        role,
      },
      include: { patient: true },
    });

    if (!user) {
      throw new NotFoundException('Please request an OTP first');
    }

    // Verify OTP
    if (!user.phoneOtpHash || !user.phoneOtpExpiresAt || user.phoneOtpExpiresAt < new Date()) {
      throw new BadRequestException('OTP expired or not found. Please request a new one.');
    }

    const otpMatches = await bcrypt.compare(otp, user.phoneOtpHash);
    if (!otpMatches) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // Update user with full details
    const updatedUser = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: {
          fullName,
          email: `${phoneNumber}@phone.user`, // Generate proper email
          dataConsentGiven: dataConsent,
          dataConsentAt: new Date(),
          phoneVerified: true,
          phoneOtpHash: null,
          phoneOtpExpiresAt: null,
          emailVerified: true,
        },
        include: { patient: true },
      });

      // Create patient profile if it doesn't exist
      if (role === 'PATIENT' && !updated.patient) {
        await tx.patient.create({
          data: {
            userId: updated.id,
            phone: phoneNumber,
          },
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: updated.id },
        include: { doctor: true, patient: true },
      });
    });

    return this.buildAuthResponse(updatedUser);
  }

  private async verifyGoogleCredential(credential: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      throw new BadRequestException('Google Sign-In is not configured');
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();

    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    return payload;
  }

  private async findUserByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
      include: { doctor: true, patient: true },
    }) as Promise<{
      id: string;
      email: string;
      fullName: string;
      role: 'PATIENT' | 'DOCTOR';
      tokenVersion: number;
      accountStatus: string;
      avatarUrl: string | null;
      doctor: { degrees: string | null; experience: string | null; hospital: string | null; availability: unknown | null } | null;
      patient: unknown;
    } | null>;
  }

  private roleMismatchMessage(role: 'PATIENT' | 'DOCTOR') {
    return role === 'DOCTOR'
      ? 'This account is registered as a Doctor. Please use the Doctor login.'
      : 'This account is registered as a Patient. Please use the Patient login.';
  }

  private buildAuthResponse(user: {
    id: string;
    email: string;
    fullName: string;
    role: 'PATIENT' | 'DOCTOR';
    tokenVersion: number;
    doctor?: { degrees: string | null; experience: string | null; hospital: string | null; availability: unknown | null } | null;
  }) {
    const accessToken = this.jwtService.sign({ sub: user.id, role: user.role, ver: user.tokenVersion });

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      accessToken,
      onboardingCompleted: this.isOnboardingCompleted(user),
    };
  }

  private isOnboardingCompleted(user: {
    role: 'PATIENT' | 'DOCTOR';
    doctor?: { degrees: string | null; experience: string | null; hospital: string | null; availability: unknown | null; profileCompleted?: boolean } | null;
  }) {
    if (user.role === 'PATIENT') {
      return true;
    }

    if (user.doctor?.profileCompleted === true) {
      return true;
    }

    const doctorAvailability = user.doctor?.availability as Record<string, unknown> | null;

    return Boolean(
      user.doctor?.degrees &&
      user.doctor?.experience &&
      user.doctor?.experience !== 'New Doctor' &&
      user.doctor?.hospital &&
      (doctorAvailability?.medicalLicenseNumber || user.doctor?.availability),
    );
  }
}
