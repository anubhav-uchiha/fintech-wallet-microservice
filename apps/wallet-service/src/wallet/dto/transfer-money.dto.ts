import { IsEmail, IsNumber, Min } from 'class-validator';

export class TransferMoneyDto {
  @IsEmail()
  receiverEmail!: string;

  @IsNumber()
  @Min(1)
  amount!: number;
}
