import {
  IsOptional,
  IsString,
  IsObject,
  IsBoolean,
  ValidateNested,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export interface StructuredAction {
  type: string;
  doctorId?: string;
  appointmentId?: string;
  slotId?: string;
  date?: string;
  timeSlot?: string;
  confirmation?: boolean;
}

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class ChatbotMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsString()
  language?: 'en' | 'hi';

  @IsOptional()
  @IsObject()
  action?: StructuredAction;

  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  location?: LocationDto;
}