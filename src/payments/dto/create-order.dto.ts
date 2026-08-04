import { IsUUID } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  appointmentId: string;
}