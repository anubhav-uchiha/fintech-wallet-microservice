import { IsEnum, IsNumberString, IsOptional } from 'class-validator';

export class GetTransactionsDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;

  @IsOptional()
  @IsEnum(['CREDIT', 'DEBIT'])
  type?: string;

  @IsOptional()
  @IsEnum(['SUCCESS', 'FAILED', 'PENDING'])
  status?: string;
}
