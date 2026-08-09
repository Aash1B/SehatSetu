import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RejectEhrDraftDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
