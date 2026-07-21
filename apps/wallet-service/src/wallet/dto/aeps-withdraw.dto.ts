import { IsNumber, IsString, Min } from 'class-validator';

export class AepsWithdrawDto {
  @IsString()
  aadhaarNumber!: string;

  @IsString()
  bankName!: string;

  @IsNumber()
  @Min(1)
  amount!: number;
}
