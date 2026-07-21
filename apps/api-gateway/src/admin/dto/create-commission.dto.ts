import { IsEnum, IsNumber, IsString } from 'class-validator';

export class CreateCommissionDto {
  @IsString()
  serviceType!: string;

  @IsEnum(['FIXED', 'PERCENTAGE'])
  commissionType!: string;

  @IsNumber()
  value!: number;

  @IsNumber()
  minimum!: number;

  @IsNumber()
  maximum!: number;
}
