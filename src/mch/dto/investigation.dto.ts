import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { InvestigationStatus } from '@prisma/client';

export class CreateInvestigationDto {
  @IsString() testName: string;
  @IsOptional() @IsDateString() testDate?: string;
  @IsOptional() @IsString() result?: string;
  @IsOptional() @IsString() unit?: string;
  @IsOptional() @IsString() referenceRange?: string;
  @IsOptional() @IsString() notes?: string;
  @IsOptional() @IsString() reportId?: string;
}

export class UpdateInvestigationDto extends CreateInvestigationDto {
  @IsOptional() @IsEnum(InvestigationStatus) status?: InvestigationStatus;
}

export class VerifyInvestigationDto {
  @IsOptional() @IsString() notes?: string;
}

export class LinkInvestigationDocDto {
  @IsString() medicalReportId: string;
  @IsOptional() @IsString() title?: string;
}
