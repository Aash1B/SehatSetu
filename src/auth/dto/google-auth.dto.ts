import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleInput } from './signup.dto';

export class GoogleAuthDto {
  @IsString()
  credential: string;

  @IsEnum(RoleInput)
  role: RoleInput;

  @IsOptional()
  @IsBoolean()
  dataConsent?: boolean;
}