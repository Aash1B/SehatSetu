import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateGrowthMeasurementDto {
  @IsDateString() measurementDate: string;
  @IsOptional() @IsNumber() @Min(0) @Max(240) ageMonths?: number;
  @IsOptional() @IsNumber() @Min(0.5) @Max(200) weightKg?: number;
  @IsOptional() @IsNumber() @Min(20) @Max(250) heightCm?: number;
  @IsOptional() @IsNumber() @Min(20) @Max(70) headCircCm?: number;
  @IsOptional() @IsNumber() @Min(30) @Max(45) temperature?: number;
  @IsOptional() @IsInt() @Min(30) @Max(300) pulseRate?: number;
  @IsOptional() @IsNumber() @Min(50) @Max(100) spo2?: number;
  @IsOptional() @IsString() notes?: string;
}

export class VerifyGrowthDto {
  @IsOptional() @IsString() notes?: string;
}
