import { IsEnum } from 'class-validator';
import { ShipmentStatus } from '../reservations.types';

export class UpdateShipmentStatusDto {
  @IsEnum(ShipmentStatus)
  status!: ShipmentStatus;
}
