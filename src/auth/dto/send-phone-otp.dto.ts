import { IsString, IsEnum, Matches, Length } from 'class-validator';

export class SendPhoneOtpDto {
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'Phone number must be exactly 10 digits' })
  phoneNumber: string;

  @IsEnum(['PATIENT', 'DOCTOR'])
  role: 'PATIENT' | 'DOCTOR';
}
