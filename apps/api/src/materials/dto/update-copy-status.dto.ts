import { IsEnum } from 'class-validator';
import { CopyStatus } from '../materials.types';

export class UpdateCopyStatusDto {
  @IsEnum(CopyStatus)
  status!: CopyStatus;
}
