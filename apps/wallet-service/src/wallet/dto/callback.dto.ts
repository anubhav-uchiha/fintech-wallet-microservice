import { IsEnum, IsString } from 'class-validator';

export class CallbackDto {
  @IsString()
  referenceId!: string;

  @IsEnum(['SUCCESS', 'FAILED'])
  status!: string;
}
