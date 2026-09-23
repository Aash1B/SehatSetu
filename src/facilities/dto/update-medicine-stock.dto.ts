import { IsOptional, IsNumber, IsIn, Min } from 'class-validator';

export class UpdateMedicineStockDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsIn(['AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK'])
  status?: 'AVAILABLE' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}
