import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';

export class UpdateCommissionDto {
  @IsOptional()
  @IsEnum([
    'ADD_MONEY',
    'WITHDRAW',
    'TRANSFER',
    'AEPS_WITHDRAW',
    'AEPS_BALANCE',
    'DTM',
  ])
  serviceType?: string;

  @IsOptional()
  @IsEnum(['FIXED', 'PERCENTAGE'])
  commissionType?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  value?: number;

  @IsOptional()
  @IsNumber()
  maximum?: number;

  @IsOptional()
  @IsNumber()
  minimum?: number;
}
