import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsNumber, IsString, Min } from 'class-validator';
import { MaterialType } from '../../loans/loan-policies';

export class CreateMaterialDto {
  @IsString()
  title!: string;

  @IsEnum(MaterialType)
  materialType!: MaterialType;

  @IsDateString()
  releaseDate!: string;

  @IsString()
  homeBranchId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice!: number;
}
