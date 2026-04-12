import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MembershipLevel } from '../loan-policies';

export class CreateLoanDto {
  @IsString()
  memberId!: string;

  @IsString()
  copyId!: string;

  @IsString()
  pickupBranchId!: string;

  @IsEnum(MembershipLevel)
  membershipLevel!: MembershipLevel;

  @IsOptional()
  @IsBoolean()
  forceCrossBranchShipment?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  activeLoansCount!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  debtTotal!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxOverdueDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  overdueLoansLast60Days!: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
