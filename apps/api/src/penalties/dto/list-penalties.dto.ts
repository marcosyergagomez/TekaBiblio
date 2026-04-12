import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PenaltyStatus, PenaltyType } from '../penalties.types';

export class ListPenaltiesDto {
  @IsOptional()
  @IsString()
  memberId?: string;

  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @IsEnum(PenaltyType)
  penaltyType?: PenaltyType;

  @IsOptional()
  @IsEnum(PenaltyStatus)
  status?: PenaltyStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
