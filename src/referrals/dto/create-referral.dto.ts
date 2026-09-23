import { IsString, IsNotEmpty, IsOptional, IsDateString, IsIn } from 'class-validator';

export class CreateReferralDto {
  @IsString()
  @IsNotEmpty({ message: 'patientId is required' })
  patientId: string;

  @IsString()
  @IsOptional()
  referredByDoctorId?: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;

  @IsString()
  @IsNotEmpty({ message: 'recommendedFacility is required' })
  recommendedFacility: string;

  @IsString()
  @IsIn(['GOVERNMENT', 'PRIVATE', 'SPECIALTY'], {
    message: 'facilityType must be GOVERNMENT, PRIVATE, or SPECIALTY',
  })
  facilityType: string;

  @IsString()
  @IsNotEmpty({ message: 'reason is required' })
  reason: string;

  @IsString()
  @IsOptional()
  @IsIn(['PENDING', 'SCHEDULED', 'VISITED', 'COMPLETED', 'DECLINED'])
  status?: string;

  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  @IsString()
  @IsOptional()
  followUpNotes?: string;
}
