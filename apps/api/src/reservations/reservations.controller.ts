import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { ListShipmentsDto } from './dto/list-shipments.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ReservationsService } from './reservations.service';

@Controller()
export class ReservationsController {
  constructor(private readonly reservationsService: ReservationsService) {}

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Post('reservations')
  async createReservation(@Body() body: CreateReservationDto) {
    return this.reservationsService.createReservation(body);
  }

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Get('reservations')
  async listReservations(
    @Query() query: ListReservationsDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const user = req.user;
    const scopedQuery: ListReservationsDto = {
      ...query,
    };

    if (user?.role === UserRole.SOCIO && user.memberId) {
      scopedQuery.memberId = user.memberId;
    }

    if (
      (user?.role === UserRole.ADMIN_SEDE ||
        user?.role === UserRole.BIBLIOTECARIO) &&
      user.branchId
    ) {
      scopedQuery.pickupBranchId = scopedQuery.pickupBranchId ?? user.branchId;
    }

    return this.reservationsService.listReservations(scopedQuery);
  }

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Get('reservations/:reservationId')
  async findReservation(@Param('reservationId') reservationId: string) {
    return this.reservationsService.findReservation(reservationId);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post('reservations/:reservationId/mark-ready')
  async markReadyForPickup(@Param('reservationId') reservationId: string) {
    return this.reservationsService.markReadyForPickup(reservationId);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post('reservations/expire-due')
  async expireDueReservations() {
    return this.reservationsService.expireDueReservations();
  }

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Get('shipments/:shipmentId')
  async findShipment(@Param('shipmentId') shipmentId: string) {
    return this.reservationsService.findShipment(shipmentId);
  }

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Get('shipments')
  async listShipments(
    @Query() query: ListShipmentsDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const user = req.user;
    const scopedQuery: ListShipmentsDto = {
      ...query,
    };

    if (user?.role === UserRole.SOCIO && user.memberId) {
      scopedQuery.memberId = user.memberId;
    }

    if (
      (user?.role === UserRole.ADMIN_SEDE ||
        user?.role === UserRole.BIBLIOTECARIO) &&
      user.branchId
    ) {
      scopedQuery.toBranchId = scopedQuery.toBranchId ?? user.branchId;
    }

    return this.reservationsService.listShipments(scopedQuery);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post('shipments/:shipmentId/status')
  async updateShipmentStatus(
    @Param('shipmentId') shipmentId: string,
    @Body() body: UpdateShipmentStatusDto,
  ) {
    return this.reservationsService.updateShipmentStatus(shipmentId, body);
  }
}
