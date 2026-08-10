import { IsOptional, IsString } from 'class-validator';

export class CreateMchDocumentDto {
  @IsString() medicalReportId: string;
  @IsString() title: string;
  @IsString() category: string;
  @IsOptional() @IsString() pregnancyId?: string;
  @IsOptional() @IsString() childId?: string;
  @IsOptional() @IsString() investigationId?: string;
  @IsOptional() @IsString() notes?: string;
}
