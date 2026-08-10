import { IsString, IsEnum, Matches, Length } from 'class-validator';

export class VerifyPhoneOtpDto {
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phoneNumber: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @IsEnum(['PATIENT', 'DOCTOR'])
  role: 'PATIENT' | 'DOCTOR';
}
