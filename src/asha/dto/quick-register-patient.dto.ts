import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class QuickRegisterPatientDto {
  @IsString()
  @IsNotEmpty({ message: 'Patient full name is required' })
  fullName: string;

  @IsString()
  @IsNotEmpty({ message: 'Gender is required' })
  gender: string;

  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'Village / Locality is required' })
  village: string;

  @IsString()
  @IsOptional()
  age?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  assignedArea?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  height?: string;

  @IsString()
  @IsOptional()
  weight?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsArray()
  @IsOptional()
  allergies?: string[];

  @IsArray()
  @IsOptional()
  chronicConditions?: string[];
}
