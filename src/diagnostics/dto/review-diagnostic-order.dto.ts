import { IsString, IsNotEmpty } from 'class-validator';

export class ReviewDiagnosticOrderDto {
  @IsString()
  @IsNotEmpty({ message: 'resultSummary is required for review' })
  resultSummary: string;
}
