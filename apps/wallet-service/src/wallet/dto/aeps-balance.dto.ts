import { IsString } from 'class-validator';

export class AepsBalanceDto {
  @IsString()
  aadhaarNumber!: string;

  @IsString()
  bankName!: string;
}
