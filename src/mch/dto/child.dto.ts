import { IsDateString, IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ChildSex } from '@prisma/client';

export class CreateChildDto {
  @IsString() name: string;
  @IsDateString() dateOfBirth: string;
  @IsEnum(ChildSex) sex: ChildSex;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsNumber() @Min(0.1) @Max(10) birthWeight?: number;
  @IsOptional() @IsNumber() @Min(20) @Max(80) birthLength?: number;
  @IsOptional() @IsNumber() @Min(20) @Max(50) birthHeadCirc?: number;
  @IsOptional() @IsString() notes?: string;
}

export class UpdateChildDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() bloodGroup?: string;
  @IsOptional() @IsString() notes?: string;
}
