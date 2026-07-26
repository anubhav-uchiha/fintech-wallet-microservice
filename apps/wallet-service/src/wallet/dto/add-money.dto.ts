import { IsNumber, IsOptional, IsUUID, Min } from 'class-validator';

export class AddMoneyDto {
  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
