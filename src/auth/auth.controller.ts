import { Body, Controller, Post, Delete, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto.email, dto.password, dto.fullName, dto.role, dto.dataConsent);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @UseGuards(JwtAuthGuard)
  @Post('whoami')
  whoAmI(@Req() req: any) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Delete('account')
  deleteAccount(@Req() req: any) {
    return this.authService.deleteAccount(req.user.userId);
  }
}