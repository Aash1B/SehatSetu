import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { MilestoneStatus } from '@prisma/client';

export class UpdateMilestoneDto {
  @IsOptional() @IsEnum(MilestoneStatus) status?: MilestoneStatus;
  @IsOptional() @IsDateString() achievedDate?: string;
  @IsOptional() @IsString() parentObservation?: string;
  @IsOptional() @IsString() notes?: string;
}

export class DoctorReviewMilestoneDto {
  @IsOptional() @IsString() doctorAssessment?: string;
  @IsOptional() @IsEnum(MilestoneStatus) status?: MilestoneStatus;
}
