import { IsString, IsOptional } from 'class-validator';

export class UploadDiagnosticReportDto {
  @IsString()
  @IsOptional()
  reportFileUrl?: string;

  @IsString()
  @IsOptional()
  reportId?: string;

  @IsString()
  @IsOptional()
  resultSummary?: string;
}
