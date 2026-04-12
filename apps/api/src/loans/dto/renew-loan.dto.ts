import { IsBoolean, IsString } from 'class-validator';

export class RenewLoanDto {
  @IsString()
  loanId!: string;

  @IsBoolean()
  hasThirdPartyReservation!: boolean;

  @IsBoolean()
  hasOutstandingDebt!: boolean;
}
