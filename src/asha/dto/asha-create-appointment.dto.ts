import { IsString, IsNotEmpty, IsOptional, IsArray, IsIn } from 'class-validator';

export class AshaCreateAppointmentDto {
  @IsString()
  @IsNotEmpty({ message: 'Patient ID is required' })
  patientId: string;

  @IsString()
  @IsNotEmpty({ message: 'Doctor ID is required' })
  doctorId: string;

  @IsString()
  @IsNotEmpty({ message: 'Date is required' })
  date: string;

  @IsString()
  @IsNotEmpty({ message: 'Time slot is required' })
  timeSlot: string;

  @IsString()
  @IsOptional()
  consultMode?: string;

  @IsString()
  @IsOptional()
  healthConcern?: string;

  @IsArray()
  @IsOptional()
  symptoms?: string[];

  @IsString()
  @IsOptional()
  duration?: string;

  @IsString()
  @IsOptional()
  severity?: string;

  @IsString()
  @IsOptional()
  urgency?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  @IsIn(['CASH_PENDING', 'WAIVED', 'PAID'])
  paymentStatus?: 'CASH_PENDING' | 'WAIVED' | 'PAID';
}
