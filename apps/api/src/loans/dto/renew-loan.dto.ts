import { IsString } from 'class-validator';

export class RenewLoanDto {
  @IsString()
  loanId!: string;
}
