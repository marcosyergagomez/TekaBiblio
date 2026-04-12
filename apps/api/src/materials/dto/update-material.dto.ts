import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { MaterialType } from '../../loans/loan-policies';

export class UpdateMaterialDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType;

  @IsOptional()
  @IsDateString()
  releaseDate?: string;

  @IsOptional()
  @IsString()
  homeBranchId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  basePrice?: number;
}
