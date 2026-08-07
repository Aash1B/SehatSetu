import { IsOptional, IsUUID } from 'class-validator';

export class ListMedicalReportsDto {
  @IsOptional()
  @IsUUID()
  patientId?: string;
}
