import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ReturnLoanDto {
  @IsString()
  loanId!: string;

  @IsOptional()
  @IsDateString()
  returnedAt?: string;
}
