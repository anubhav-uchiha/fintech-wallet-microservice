import { IsNumber, Min } from 'class-validator';

export class WithdrawMoneyDto {
  @IsNumber()
  @Min(1)
  amount!: number;
}
