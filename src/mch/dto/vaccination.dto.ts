import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { VaccinationStatus } from '@prisma/client';

export class RecordVaccinationDto {
  @IsString() vaccinationRecordId: string;
  @IsDateString() administeredDate: string;
  @IsOptional() @IsString() administeredAt?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateVaccinationDto {
  @IsOptional() @IsEnum(VaccinationStatus) status?: VaccinationStatus;
  @IsOptional() @IsDateString() administeredDate?: string;
  @IsOptional() @IsString() administeredAt?: string;
  @IsOptional() @IsString() batchNumber?: string;
  @IsOptional() @IsString() notes?: string;
}

export class VerifyVaccinationDto {
  @IsOptional() @IsString() notes?: string;
}

export class AddVaccinationDto {
  @IsString() vaccineName: string;
  @IsInt() @Min(1) doseNumber: number;
  @IsDateString() scheduledDate: string;
  @IsOptional() @IsString() notes?: string;
}
