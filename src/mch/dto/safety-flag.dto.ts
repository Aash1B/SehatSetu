import { IsString, IsOptional } from 'class-validator';

export class ReviewFlagDto {
  @IsOptional() @IsString() reviewNotes?: string;
}
