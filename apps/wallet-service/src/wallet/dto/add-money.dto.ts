import { IsNumber, Min } from 'class-validator';

export class AddMoneyDto {
  @IsNumber()
  @Min(1)
  amount!: number;
}
