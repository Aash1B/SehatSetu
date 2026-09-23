import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class UpdateReferralStatusDto {
  @IsString()
  @IsNotEmpty({ message: 'status is required' })
  @IsIn(['PENDING', 'SCHEDULED', 'VISITED', 'COMPLETED', 'DECLINED'], {
    message: 'status must be PENDING, SCHEDULED, VISITED, COMPLETED, or DECLINED',
  })
  status: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsDateString()
  @IsOptional()
  completedAt?: string;

  @IsString()
  @IsOptional()
  followUpNotes?: string;
}
