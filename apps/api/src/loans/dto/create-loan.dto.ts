import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
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

  @IsOptional()
  @IsDateString()
  startDate?: string;
}
