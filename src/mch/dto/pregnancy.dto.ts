import { IsDateString, IsEnum, IsInt, IsOptional, IsString, IsArray, Min, Max } from 'class-validator';
import { PregnancyStatus } from '@prisma/client';

export class CreatePregnancyDto {
  @IsOptional() @IsDateString() lmpDate?: string;
  @IsOptional() @IsDateString() eddUltrasound?: string;
  @IsOptional() @IsInt() @Min(0) @Max(50) gestationalWeeksAtBooking?: number;
  @IsOptional() @IsInt() @Min(1) @Max(20) gravida?: number;
  @IsOptional() @IsInt() @Min(0) @Max(20) para?: number;
  @IsOptional() @IsInt() @Min(0) @Max(20) abortions?: number;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() rhFactor?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) highRiskFactors?: string[];
  @IsOptional() @IsString() notes?: string;
}

export class UpdatePregnancyDto extends CreatePregnancyDto {
  @IsOptional() @IsEnum(PregnancyStatus) status?: PregnancyStatus;
  @IsOptional() @IsDateString() deliveryDate?: string;
  @IsOptional() @IsString() deliveryType?: string;
  @IsOptional() @IsString() deliveryOutcome?: string;
}
