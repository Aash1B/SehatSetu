import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateDiagnosticOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'patientId is required' })
  patientId: string;

  @IsString()
  @IsOptional()
  orderedByDoctorId?: string;

  @IsString()
  @IsOptional()
  appointmentId?: string;

  @IsString()
  @IsNotEmpty({ message: 'testName is required' })
  testName: string;

  @IsString()
  @IsIn(['BLOOD', 'IMAGING', 'URINE', 'OTHER'], {
    message: 'testType must be BLOOD, IMAGING, URINE, or OTHER',
  })
  testType: string;

  @IsString()
  @IsOptional()
  instructions?: string;
}
