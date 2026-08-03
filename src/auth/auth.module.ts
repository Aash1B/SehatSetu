import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { MedicalReportsModule } from '../medical-reports/medical-reports.module';
import { AccountController } from './account.controller';
import { AccountDeletionService } from './account-deletion.service';

@Module({
  imports: [
    PassportModule,
    MedicalReportsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'sehatsetu_secret_key_12345',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController, AccountController],
  providers: [AuthService, JwtStrategy, AccountDeletionService],
})
export class AuthModule {}
