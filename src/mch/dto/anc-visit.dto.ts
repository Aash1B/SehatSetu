import { IsDateString, IsInt, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';

export class CreateAncVisitDto {
  @IsDateString() visitDate: string;
  @IsOptional() @IsInt() @Min(4) @Max(46) gestationalWeek?: number;
  @IsOptional() @IsNumber() @Min(20) @Max(200) weight?: number;
  @IsOptional() @IsInt() @Min(40) @Max(300) systolicBp?: number;
  @IsOptional() @IsInt() @Min(20) @Max(200) diastolicBp?: number;
  @IsOptional() @IsInt() @Min(20) @Max(300) pulseRate?: number;
  @IsOptional() @IsNumber() @Min(1) @Max(25) hemoglobin?: number;
  @IsOptional() @IsInt() @Min(60) @Max(220) fetalHeartRate?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(60) fundalHeight?: number;
  @IsOptional() @IsString() urineProtein?: string;
  @IsOptional() @IsString() urineGlucose?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(600) bloodSugarFasting?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(600) bloodSugarPp?: number;
  @IsOptional() @IsString() complaints?: string;
  @IsOptional() @IsString() clinicalFindings?: string;
  @IsOptional() @IsString() advice?: string;
  @IsOptional() @IsDateString() nextVisitDate?: string;
}

export class UpdateAncVisitDto extends CreateAncVisitDto {}

export class VerifyAncVisitDto {
  @IsOptional() @IsString() verificationNotes?: string;
  @IsOptional() @IsString() clinicalFindings?: string;
  @IsOptional() @IsString() advice?: string;
}
