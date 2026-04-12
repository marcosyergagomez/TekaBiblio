import { IsString } from 'class-validator';

export class CreateLoanPenaltyDto {
  @IsString()
  loanId!: string;
}
