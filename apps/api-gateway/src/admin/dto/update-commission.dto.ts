import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateCommissionDto {
  @IsOptional()
  @IsEnum(['FIXED', 'PERCENTAGE'])
  commissionType?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  value?: number;
}
