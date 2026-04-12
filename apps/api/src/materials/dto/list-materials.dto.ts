import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { MaterialType } from '../../loans/loan-policies';

export class ListMaterialsDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsEnum(MaterialType)
  materialType?: MaterialType;

  @IsOptional()
  @IsString()
  homeBranchId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  availableOnly?: boolean;

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
