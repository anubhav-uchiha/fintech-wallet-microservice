import { IsNumber, IsString } from 'class-validator';

export class CalculateCommissionDto {
  @IsString()
  serviceType!: string;

  @IsNumber()
  amount!: number;
}
