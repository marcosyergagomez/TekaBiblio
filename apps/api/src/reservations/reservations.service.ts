import { ConflictException, Injectable } from '@nestjs/common';
import { MaterialsService } from '../materials/materials.service';
import { CopyStatus } from '../materials/materials.types';
import { getShipmentFee } from '../loans/loan-policies';
import { paginateFromQuery } from '../common/pagination';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { ListReservationsDto } from './dto/list-reservations.dto';
import { ListShipmentsDto } from './dto/list-shipments.dto';
import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';
import { ReservationsRepository } from './reservations.repository';
import {
  ReservationRecord,
  ReservationStatus,
  ShipmentRecord,
  ShipmentStatus,
} from './reservations.types';

const RESERVATION_PICKUP_WINDOW_HOURS = 48;
const RESERVATION_EXPIRE_FEE = 1.0;
const SHIPMENT_TARGET_HOURS = 48;
const SHIPMENT_DEADLINE_DAYS = 3;

function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

@Injectable()
export class ReservationsService {
  constructor(
    private readonly reservationsRepository: ReservationsRepository,
    private readonly materialsService: MaterialsService,
  ) {}

  async createReservation(input: CreateReservationDto): Promise<{
    reservation: ReservationRecord;
    shipment?: ShipmentRecord;
  }> {
    await this.materialsService.getMaterialOrThrow(input.materialId);

    let reservation = await this.reservationsRepository.createReservation({
      memberId: input.memberId,
      materialId: input.materialId,
      sourceBranchId: input.sourceBranchId,
      pickupBranchId: input.pickupBranchId,
    });

    let shipment: ShipmentRecord | undefined;

    if (input.sourceBranchId === input.pickupBranchId) {
      const now = new Date();
      reservation.status = ReservationStatus.READY_FOR_PICKUP;
      reservation.readyForPickupAt = now.toISOString();
      reservation.expiresAt = addHours(
        now,
        RESERVATION_PICKUP_WINDOW_HOURS,
      ).toISOString();
      reservation =
        await this.reservationsRepository.saveReservation(reservation);
    } else {
      const copies = await this.materialsService.listCopies();
      const availableCopy = copies.find((copy) => {
        return (
          copy.materialId === input.materialId &&
          copy.branchId === input.sourceBranchId &&
          copy.status === CopyStatus.AVAILABLE
        );
      });

      if (!availableCopy) {
        throw new ConflictException(
          'No source copy available for cross-branch reservation',
        );
      }

      const now = new Date();
      shipment = await this.reservationsRepository.createShipment({
        reservationId: reservation.id,
        copyId: availableCopy.id,
        fromBranchId: input.sourceBranchId,
        toBranchId: input.pickupBranchId,
        chargedFee: getShipmentFee(input.membershipLevel, true),
        requestedAt: now.toISOString(),
        slaTargetAt: addHours(now, SHIPMENT_TARGET_HOURS).toISOString(),
        slaDeadlineAt: addDays(now, SHIPMENT_DEADLINE_DAYS).toISOString(),
      });
    }

    return { reservation, shipment };
  }

  async findReservation(reservationId: string): Promise<ReservationRecord> {
    return this.reservationsRepository.getReservationOrThrow(reservationId);
  }

  async findShipment(shipmentId: string): Promise<ShipmentRecord> {
    return this.reservationsRepository.getShipmentOrThrow(shipmentId);
  }

  async listReservations(query: ListReservationsDto): Promise<{
    items: ReservationRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let items = await this.reservationsRepository.findReservations();

    if (query.memberId) {
      items = items.filter(
        (reservation) => reservation.memberId === query.memberId,
      );
    }

    if (query.status) {
      items = items.filter(
        (reservation) => reservation.status === query.status,
      );
    }

    if (query.pickupBranchId) {
      items = items.filter(
        (reservation) => reservation.pickupBranchId === query.pickupBranchId,
      );
    }

    return paginateFromQuery(items, query, 20);
  }

  async listShipments(query: ListShipmentsDto): Promise<{
    items: ShipmentRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    let items = await this.reservationsRepository.findShipments();

    if (query.memberId) {
      items = items.filter((shipment) => shipment.memberId === query.memberId);
    }

    if (query.status) {
      items = items.filter((shipment) => shipment.status === query.status);
    }

    if (query.toBranchId) {
      items = items.filter(
        (shipment) => shipment.toBranchId === query.toBranchId,
      );
    }

    return paginateFromQuery(items, query, 20);
  }

  async markReadyForPickup(reservationId: string): Promise<ReservationRecord> {
    const reservation =
      await this.reservationsRepository.getReservationOrThrow(reservationId);
    const now = new Date();

    reservation.status = ReservationStatus.READY_FOR_PICKUP;
    reservation.readyForPickupAt = now.toISOString();
    reservation.expiresAt = addHours(
      now,
      RESERVATION_PICKUP_WINDOW_HOURS,
    ).toISOString();

    return this.reservationsRepository.saveReservation(reservation);
  }

  async expireDueReservations(): Promise<{ expiredCount: number }> {
    const nowIso = new Date().toISOString();
    const due =
      await this.reservationsRepository.findExpiredReadyReservations(nowIso);

    for (const reservation of due) {
      reservation.status = ReservationStatus.EXPIRED;
      reservation.expireFee = RESERVATION_EXPIRE_FEE;
      await this.reservationsRepository.saveReservation(reservation);
    }

    return { expiredCount: due.length };
  }

  async updateShipmentStatus(
    shipmentId: string,
    input: UpdateShipmentStatusDto,
  ): Promise<{ shipment: ShipmentRecord; reservation?: ReservationRecord }> {
    const shipment =
      await this.reservationsRepository.getShipmentOrThrow(shipmentId);
    shipment.status = input.status;

    if (input.status === ShipmentStatus.DELIVERED) {
      shipment.deliveredAt = new Date().toISOString();
    }

    const savedShipment =
      await this.reservationsRepository.saveShipment(shipment);

    if (savedShipment.loanId) {
      await this.syncCopyStatusFromLoanShipment(savedShipment);
    }

    if (!savedShipment.reservationId) {
      return { shipment: savedShipment };
    }

    const reservation = await this.reservationsRepository.getReservationOrThrow(
      savedShipment.reservationId,
    );

    if (
      input.status === ShipmentStatus.ARRIVED ||
      input.status === ShipmentStatus.READY_FOR_PICKUP
    ) {
      const now = new Date();
      reservation.status = ReservationStatus.READY_FOR_PICKUP;
      reservation.readyForPickupAt = now.toISOString();
      reservation.expiresAt = addHours(
        now,
        RESERVATION_PICKUP_WINDOW_HOURS,
      ).toISOString();
      await this.reservationsRepository.saveReservation(reservation);
      return { shipment: savedShipment, reservation };
    }

    if (
      input.status === ShipmentStatus.LOST ||
      input.status === ShipmentStatus.CANCELLED
    ) {
      reservation.status = ReservationStatus.CANCELLED;
      await this.reservationsRepository.saveReservation(reservation);
      return { shipment: savedShipment, reservation };
    }

    return { shipment: savedShipment, reservation };
  }

  private async syncCopyStatusFromLoanShipment(
    shipment: ShipmentRecord,
  ): Promise<void> {
    if (
      shipment.status === ShipmentStatus.REQUESTED ||
      shipment.status === ShipmentStatus.PREPARING
    ) {
      await this.materialsService.updateCopyStatus(
        shipment.copyId,
        CopyStatus.IN_TRANSFER,
      );
      return;
    }

    if (shipment.status === ShipmentStatus.IN_TRANSIT) {
      await this.materialsService.updateCopyStatus(
        shipment.copyId,
        CopyStatus.IN_TRANSFER,
      );
      return;
    }

    if (
      shipment.status === ShipmentStatus.ARRIVED ||
      shipment.status === ShipmentStatus.READY_FOR_PICKUP ||
      shipment.status === ShipmentStatus.DELIVERED
    ) {
      await this.materialsService.updateCopyStatus(
        shipment.copyId,
        CopyStatus.ON_LOAN,
      );
      return;
    }

    if (shipment.status === ShipmentStatus.CANCELLED) {
      await this.materialsService.updateCopyStatus(
        shipment.copyId,
        CopyStatus.AVAILABLE,
      );
      return;
    }

    if (shipment.status === ShipmentStatus.LOST) {
      await this.materialsService.updateCopyStatus(
        shipment.copyId,
        CopyStatus.LOST,
      );
    }
  }
}
