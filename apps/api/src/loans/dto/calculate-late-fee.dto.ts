import { Type } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { MaterialType } from '../loan-policies';

export class CalculateLateFeeDto {
  @IsEnum(MaterialType)
  materialType!: MaterialType;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  overdueDays!: number;
}
