import { IsOptional, IsString } from 'class-validator';

export class WaivePenaltyDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
