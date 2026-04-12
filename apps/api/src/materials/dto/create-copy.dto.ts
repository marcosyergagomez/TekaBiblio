import { IsString } from 'class-validator';

export class CreateCopyDto {
  @IsString()
  materialId!: string;

  @IsString()
  branchId!: string;
}
