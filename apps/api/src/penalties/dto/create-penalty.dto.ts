import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { PenaltyType } from '../penalties.types';

export class CreatePenaltyDto {
  @IsString()
  memberId!: string;

  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @IsString()
  reservationId?: string;

  @IsEnum(PenaltyType)
  penaltyType!: PenaltyType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  amount!: number;

  @IsString()
  reason!: string;
}
