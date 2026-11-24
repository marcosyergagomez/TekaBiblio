import {
  ConflictException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { SqlStoreService } from '../database/sql-store.service';
import { MaterialsService } from '../materials/materials.service';
import { CopyStatus } from '../materials/materials.types';
import { getShipmentFee, MembershipLevel } from '../loans/loan-policies';
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
    @Optional() private readonly sqlStore?: SqlStoreService,
  ) {}

  async createReservation(input: CreateReservationDto): Promise<{
    reservation: ReservationRecord;
    shipment?: ShipmentRecord;
  }> {
    if (this.sqlStore?.isEnabled()) {
      return this.sqlStore.transaction(() => this.createReservationWork(input));
    }

    return this.createReservationWork(input);
  }

  private async createReservationWork(input: CreateReservationDto): Promise<{
    reservation: ReservationRecord;
    shipment?: ShipmentRecord;
  }> {
    await this.materialsService.getMaterialOrThrow(input.materialId);

    let shipment: ShipmentRecord | undefined;
    let heldCopyId: string | undefined;
    if (input.sourceBranchId !== input.pickupBranchId) {
      const availableCopy = await this.materialsService.findAvailableCopy(
        input.materialId,
        input.sourceBranchId,
      );
      if (!availableCopy) {
        throw new ConflictException(
          'No source copy available for cross-branch reservation',
        );
      }

      await this.materialsService.claimAvailableCopy(
        availableCopy.id,
        CopyStatus.IN_TRANSFER,
      );
      heldCopyId = availableCopy.id;
    }

    let reservation: ReservationRecord;
    try {
      reservation = await this.reservationsRepository.createReservation({
        memberId: input.memberId,
        materialId: input.materialId,
        sourceBranchId: input.sourceBranchId,
        pickupBranchId: input.pickupBranchId,
      });
    } catch (error) {
      if (heldCopyId) {
        await this.materialsService.updateCopyStatus(
          heldCopyId,
          CopyStatus.AVAILABLE,
        );
      }

      throw error;
    }

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
    } else if (heldCopyId) {
      const now = new Date();
      try {
        shipment = await this.reservationsRepository.createShipment({
          reservationId: reservation.id,
          memberId: input.memberId,
          copyId: heldCopyId,
          fromBranchId: input.sourceBranchId,
          toBranchId: input.pickupBranchId,
          chargedFee: getShipmentFee(
            await this.resolveMembershipLevel(input),
            true,
          ),
          requestedAt: now.toISOString(),
          slaTargetAt: addHours(now, SHIPMENT_TARGET_HOURS).toISOString(),
          slaDeadlineAt: addDays(now, SHIPMENT_DEADLINE_DAYS).toISOString(),
        });
      } catch (error) {
        reservation.status = ReservationStatus.CANCELLED;
        await this.reservationsRepository.saveReservation(reservation);
        await this.materialsService.updateCopyStatus(
          heldCopyId,
          CopyStatus.AVAILABLE,
        );
        throw error;
      }
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
    } else if (savedShipment.status === ShipmentStatus.CANCELLED) {
      await this.materialsService.updateCopyStatus(
        savedShipment.copyId,
        CopyStatus.AVAILABLE,
      );
    } else if (savedShipment.status === ShipmentStatus.LOST) {
      await this.materialsService.updateCopyStatus(
        savedShipment.copyId,
        CopyStatus.LOST,
      );
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

  private async resolveMembershipLevel(
    input: CreateReservationDto,
  ): Promise<MembershipLevel> {
    if (!this.sqlStore?.isEnabled()) {
      return input.membershipLevel ?? MembershipLevel.BRONCE;
    }

    const rows = await this.sqlStore.query<
      RowDataPacket & { membershipLevel: string }
    >(
      `SELECT membership_level AS membershipLevel
       FROM members
       WHERE id = ?
       LIMIT 1`,
      [input.memberId],
    );
    const level = rows[0]?.membershipLevel;
    if (!Object.values(MembershipLevel).includes(level as MembershipLevel)) {
      throw new NotFoundException(`Member ${input.memberId} not found`);
    }

    return level as MembershipLevel;
  }
}
