import { IsString, IsEnum, IsBoolean, Matches, Length, MinLength } from 'class-validator';

export class PhoneSignupDto {
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phoneNumber: string;

  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  otp: string;

  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName: string;

  @IsEnum(['PATIENT'])
  role: 'PATIENT';

  @IsBoolean()
  dataConsent: boolean;
}
