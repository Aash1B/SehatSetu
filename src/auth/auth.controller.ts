import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordOtpDto } from './dto/reset-password-otp.dto';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.email, dto.password, dto.fullName, dto.role, dto.dataConsent);
  }

  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.otp);
  }

  @Post('resend-otp')
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto.email);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post('google')
  google(@Body() dto: GoogleAuthDto) {
    return this.authService.googleLogin(dto.credential, dto.role, dto.dataConsent);
  }

  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  changePassword(@Req() req: any, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto.currentPassword, dto.newPassword);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-reset-otp')
  sendResetOtp(@Req() req: any) {
    return this.authService.sendResetOtp(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password-otp')
  resetPasswordOtp(@Req() req: any, @Body() dto: ResetPasswordOtpDto) {
    return this.authService.resetPasswordWithOtp(req.user.userId, dto.otp, dto.newPassword);
  }

  @Post('send-phone-otp')
  sendPhoneOtp(@Body() dto: any) {
    return this.authService.sendPhoneOtp(dto.phoneNumber, dto.role);
  }

  @Post('verify-phone-otp')
  verifyPhoneOtp(@Body() dto: any) {
    return this.authService.verifyPhoneOtp(dto.phoneNumber, dto.otp, dto.role);
  }

  @Post('phone-signup')
  phoneSignup(@Body() dto: any) {
    return this.authService.phoneSignup(dto.phoneNumber, dto.otp, dto.fullName, dto.role, dto.dataConsent);
  }

  @UseGuards(JwtAuthGuard)
  @Post('whoami')
  whoAmI(@Req() req: any) {
    return req.user;
  }

}
