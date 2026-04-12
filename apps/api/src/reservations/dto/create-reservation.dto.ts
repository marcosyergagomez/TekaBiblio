import { IsEnum, IsString } from 'class-validator';
import { MembershipLevel } from '../../loans/loan-policies';

export class CreateReservationDto {
  @IsString()
  memberId!: string;

  @IsString()
  materialId!: string;

  @IsString()
  sourceBranchId!: string;

  @IsString()
  pickupBranchId!: string;

  @IsEnum(MembershipLevel)
  membershipLevel!: MembershipLevel;
}
