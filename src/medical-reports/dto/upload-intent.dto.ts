import {
  IsEnum,
  IsInt,
  IsMimeType,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { MedicalReportType } from '@prisma/client';

export class UploadIntentDto {
  @IsUUID()
  patientId!: string;

  @IsOptional()
  @IsUUID()
  appointmentId?: string;

  @IsString()
  @MaxLength(255)
  originalFileName!: string;

  @IsString()
  @IsMimeType()
  mimeType!: string;

  @IsInt()
  @Min(1)
  fileSizeBytes!: number;

  @IsEnum(MedicalReportType)
  reportType!: MedicalReportType;
}
