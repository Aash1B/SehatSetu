import { IsEmail, IsString, MinLength, IsEnum, IsBoolean, Equals } from 'class-validator';

export enum RoleInput {
  PATIENT = 'PATIENT',
  DOCTOR = 'DOCTOR',
}

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @IsString()
  fullName: string;

  @IsEnum(RoleInput)
  role: RoleInput;

  @IsBoolean()
  @Equals(true, { message: 'You must consent to data storage to create an account' })
  dataConsent: boolean;
}