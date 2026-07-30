import { IsString } from 'class-validator';

export class AiSummaryDto {
  @IsString()
  summary: string;
}