import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { SqlStoreService } from '../database/sql-store.service';
import {
  CreateReservationInput,
  CreateShipmentInput,
  ReservationRecord,
  ReservationStatus,
  ShipmentRecord,
  ShipmentStatus,
} from './reservations.types';

type ReservationRow = RowDataPacket & {
  id: string;
  memberId: string;
  materialId: string;
  sourceBranchId: string;
  pickupBranchId: string;
  status: string;
  queuePosition: number;
  readyForPickupAt: Date | string | null;
  expiresAt: Date | string | null;
  expireFee: number;
};

type ShipmentRow = RowDataPacket & {
  id: string;
  reservationId: string | null;
  loanId: string | null;
  memberId: string | null;
  copyId: string;
  fromBranchId: string;
  toBranchId: string;
  status: string;
  baseFee: number;
  chargedFee: number;
  requestedAt: Date | string;
  deliveredAt: Date | string | null;
  slaTargetAt: Date | string;
  slaDeadlineAt: Date | string;
};

@Injectable()
export class ReservationsRepository {
  private readonly reservations = new Map<string, ReservationRecord>();
  private readonly shipments = new Map<string, ShipmentRecord>();

  constructor(@Optional() private readonly sqlStore?: SqlStoreService) {}

  async createReservation(
    input: CreateReservationInput,
  ): Promise<ReservationRecord> {
    const queuePosition = await this.nextQueuePosition(input.materialId);

    const reservation: ReservationRecord = {
      id: `res_${randomUUID().slice(0, 8)}`,
      memberId: input.memberId,
      materialId: input.materialId,
      sourceBranchId: input.sourceBranchId,
      pickupBranchId: input.pickupBranchId,
      status: ReservationStatus.QUEUED,
      queuePosition,
      expireFee: 0,
    };

    if (!this.isSqlEnabled()) {
      this.reservations.set(reservation.id, reservation);
      return reservation;
    }

    await this.sqlStore!.execute(
      `INSERT INTO reservations (
        id, member_id, material_id, source_branch_id, pickup_branch_id,
        status, queue_position, ready_for_pickup_at, expires_at, expire_fee
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        reservation.id,
        reservation.memberId,
        reservation.materialId,
        reservation.sourceBranchId,
        reservation.pickupBranchId,
        reservation.status,
        reservation.queuePosition,
        null,
        null,
        reservation.expireFee,
      ],
    );

    return reservation;
  }

  async saveReservation(
    reservation: ReservationRecord,
  ): Promise<ReservationRecord> {
    if (!this.isSqlEnabled()) {
      this.reservations.set(reservation.id, reservation);
      return reservation;
    }

    await this.sqlStore!.execute(
      `UPDATE reservations
       SET member_id = ?, material_id = ?, source_branch_id = ?, pickup_branch_id = ?,
           status = ?, queue_position = ?, ready_for_pickup_at = ?, expires_at = ?, expire_fee = ?
       WHERE id = ?`,
      [
        reservation.memberId,
        reservation.materialId,
        reservation.sourceBranchId,
        reservation.pickupBranchId,
        reservation.status,
        reservation.queuePosition,
        reservation.readyForPickupAt
          ? this.toMysqlDateTime(reservation.readyForPickupAt)
          : null,
        reservation.expiresAt
          ? this.toMysqlDateTime(reservation.expiresAt)
          : null,
        reservation.expireFee,
        reservation.id,
      ],
    );

    return reservation;
  }

  async findReservationById(
    id: string,
  ): Promise<ReservationRecord | undefined> {
    if (!this.isSqlEnabled()) {
      return this.reservations.get(id);
    }

    const rows = await this.sqlStore!.query<ReservationRow>(
      `SELECT
         id,
         member_id AS memberId,
         material_id AS materialId,
         source_branch_id AS sourceBranchId,
         pickup_branch_id AS pickupBranchId,
         status,
         queue_position AS queuePosition,
         ready_for_pickup_at AS readyForPickupAt,
         expires_at AS expiresAt,
         expire_fee AS expireFee
       FROM reservations
       WHERE id = ?
       LIMIT 1`,
      [id],
    );

    const row = rows[0];
    if (!row) {
      return undefined;
    }

    return this.mapReservationRow(row);
  }

  async findExpiredReadyReservations(
    nowIso: string,
  ): Promise<ReservationRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.reservations.values()).filter((reservation) => {
        return (
          reservation.status === ReservationStatus.READY_FOR_PICKUP &&
          reservation.expiresAt !== undefined &&
          reservation.expiresAt < nowIso
        );
      });
    }

    const rows = await this.sqlStore!.query<ReservationRow>(
      `SELECT
         id,
         member_id AS memberId,
         material_id AS materialId,
         source_branch_id AS sourceBranchId,
         pickup_branch_id AS pickupBranchId,
         status,
         queue_position AS queuePosition,
         ready_for_pickup_at AS readyForPickupAt,
         expires_at AS expiresAt,
         expire_fee AS expireFee
       FROM reservations
       WHERE status = ? AND expires_at IS NOT NULL AND expires_at < ?`,
      [ReservationStatus.READY_FOR_PICKUP, this.toMysqlDateTime(nowIso)],
    );

    return rows.map((row) => this.mapReservationRow(row));
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentRecord> {
    const shipment: ShipmentRecord = {
      id: `shp_${randomUUID().slice(0, 8)}`,
      reservationId: input.reservationId,
      loanId: input.loanId,
      copyId: input.copyId,
      fromBranchId: input.fromBranchId,
      toBranchId: input.toBranchId,
      status: ShipmentStatus.REQUESTED,
      baseFee: 2.99,
      chargedFee: input.chargedFee,
      requestedAt: input.requestedAt,
      slaTargetAt: input.slaTargetAt,
      slaDeadlineAt: input.slaDeadlineAt,
    };

    if (!this.isSqlEnabled()) {
      this.shipments.set(shipment.id, shipment);
      return shipment;
    }

    await this.sqlStore!.execute(
      `INSERT INTO shipments (
        id, reservation_id, loan_id, copy_id, from_branch_id, to_branch_id, status,
        base_fee, charged_fee, requested_at, delivered_at, sla_target_at, sla_deadline_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipment.id,
        shipment.reservationId ?? null,
        shipment.loanId ?? null,
        shipment.copyId,
        shipment.fromBranchId,
        shipment.toBranchId,
        shipment.status,
        shipment.baseFee,
        shipment.chargedFee,
        this.toMysqlDateTime(shipment.requestedAt),
        null,
        this.toMysqlDateTime(shipment.slaTargetAt),
        this.toMysqlDateTime(shipment.slaDeadlineAt),
      ],
    );

    return shipment;
  }

  async saveShipment(shipment: ShipmentRecord): Promise<ShipmentRecord> {
    if (!this.isSqlEnabled()) {
      this.shipments.set(shipment.id, shipment);
      return shipment;
    }

    await this.sqlStore!.execute(
      `UPDATE shipments
       SET reservation_id = ?, loan_id = ?, copy_id = ?, from_branch_id = ?, to_branch_id = ?,
           status = ?, base_fee = ?, charged_fee = ?, requested_at = ?, delivered_at = ?,
           sla_target_at = ?, sla_deadline_at = ?
       WHERE id = ?`,
      [
        shipment.reservationId ?? null,
        shipment.loanId ?? null,
        shipment.copyId,
        shipment.fromBranchId,
        shipment.toBranchId,
        shipment.status,
        shipment.baseFee,
        shipment.chargedFee,
        this.toMysqlDateTime(shipment.requestedAt),
        shipment.deliveredAt
          ? this.toMysqlDateTime(shipment.deliveredAt)
          : null,
        this.toMysqlDateTime(shipment.slaTargetAt),
        this.toMysqlDateTime(shipment.slaDeadlineAt),
        shipment.id,
      ],
    );

    return shipment;
  }

  async findShipmentById(id: string): Promise<ShipmentRecord | undefined> {
    if (!this.isSqlEnabled()) {
      return this.shipments.get(id);
    }

    const rows = await this.sqlStore!.query<ShipmentRow>(
      `SELECT
         shipments.id AS id,
         shipments.reservation_id AS reservationId,
         shipments.loan_id AS loanId,
         COALESCE(r.member_id, l.member_id) AS memberId,
         shipments.copy_id AS copyId,
         shipments.from_branch_id AS fromBranchId,
         shipments.to_branch_id AS toBranchId,
         shipments.status AS status,
         shipments.base_fee AS baseFee,
         shipments.charged_fee AS chargedFee,
         shipments.requested_at AS requestedAt,
         shipments.delivered_at AS deliveredAt,
         shipments.sla_target_at AS slaTargetAt,
         shipments.sla_deadline_at AS slaDeadlineAt
       FROM shipments
       LEFT JOIN reservations r ON r.id = shipments.reservation_id
       LEFT JOIN loans l ON l.id = shipments.loan_id
       WHERE shipments.id = ?
       LIMIT 1`,
      [id],
    );

    const row = rows[0];
    if (!row) {
      return undefined;
    }

    return this.mapShipmentRow(row);
  }

  async findReservations(): Promise<ReservationRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.reservations.values());
    }

    const rows = await this.sqlStore!.query<ReservationRow>(
      `SELECT
         id,
         member_id AS memberId,
         material_id AS materialId,
         source_branch_id AS sourceBranchId,
         pickup_branch_id AS pickupBranchId,
         status,
         queue_position AS queuePosition,
         ready_for_pickup_at AS readyForPickupAt,
         expires_at AS expiresAt,
         expire_fee AS expireFee
       FROM reservations
       ORDER BY created_at DESC`,
    );

    return rows.map((row) => this.mapReservationRow(row));
  }

  async findShipments(): Promise<ShipmentRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.shipments.values());
    }

    const rows = await this.sqlStore!.query<ShipmentRow>(
      `SELECT
         shipments.id AS id,
         shipments.reservation_id AS reservationId,
         shipments.loan_id AS loanId,
         COALESCE(r.member_id, l.member_id) AS memberId,
         shipments.copy_id AS copyId,
         shipments.from_branch_id AS fromBranchId,
         shipments.to_branch_id AS toBranchId,
         shipments.status AS status,
         shipments.base_fee AS baseFee,
         shipments.charged_fee AS chargedFee,
         shipments.requested_at AS requestedAt,
         shipments.delivered_at AS deliveredAt,
         shipments.sla_target_at AS slaTargetAt,
         shipments.sla_deadline_at AS slaDeadlineAt
       FROM shipments
       LEFT JOIN reservations r ON r.id = shipments.reservation_id
       LEFT JOIN loans l ON l.id = shipments.loan_id
       ORDER BY shipments.created_at DESC`,
    );

    return rows.map((row) => this.mapShipmentRow(row));
  }

  async getReservationOrThrow(id: string): Promise<ReservationRecord> {
    const reservation = await this.findReservationById(id);
    if (!reservation) {
      throw new NotFoundException(`Reservation ${id} not found`);
    }

    return reservation;
  }

  async getShipmentOrThrow(id: string): Promise<ShipmentRecord> {
    const shipment = await this.findShipmentById(id);
    if (!shipment) {
      throw new NotFoundException(`Shipment ${id} not found`);
    }

    return shipment;
  }

  private async nextQueuePosition(materialId: string): Promise<number> {
    if (!this.isSqlEnabled()) {
      const count = Array.from(this.reservations.values()).filter(
        (reservation) => {
          return (
            reservation.materialId === materialId &&
            reservation.status === ReservationStatus.QUEUED
          );
        },
      ).length;

      return count + 1;
    }

    const rows = await this.sqlStore!.query<RowDataPacket & { total: number }>(
      `SELECT COUNT(*) AS total
       FROM reservations
       WHERE material_id = ? AND status = ?`,
      [materialId, ReservationStatus.QUEUED],
    );

    return Number(rows[0]?.total ?? 0) + 1;
  }

  private isSqlEnabled(): boolean {
    return this.sqlStore?.isEnabled() ?? false;
  }

  private toMysqlDateTime(value: string): string {
    return value.slice(0, 19).replace('T', ' ');
  }

  private mapReservationRow(row: ReservationRow): ReservationRecord {
    return {
      id: row.id,
      memberId: row.memberId,
      materialId: row.materialId,
      sourceBranchId: row.sourceBranchId,
      pickupBranchId: row.pickupBranchId,
      status: row.status as ReservationStatus,
      queuePosition: Number(row.queuePosition),
      readyForPickupAt: row.readyForPickupAt
        ? new Date(row.readyForPickupAt).toISOString()
        : undefined,
      expiresAt: row.expiresAt
        ? new Date(row.expiresAt).toISOString()
        : undefined,
      expireFee: Number(row.expireFee),
    };
  }

  private mapShipmentRow(row: ShipmentRow): ShipmentRecord {
    return {
      id: row.id,
      reservationId: row.reservationId ?? undefined,
      loanId: row.loanId ?? undefined,
      memberId: row.memberId ?? undefined,
      copyId: row.copyId,
      fromBranchId: row.fromBranchId,
      toBranchId: row.toBranchId,
      status: row.status as ShipmentStatus,
      baseFee: Number(row.baseFee),
      chargedFee: Number(row.chargedFee),
      requestedAt: new Date(row.requestedAt).toISOString(),
      deliveredAt: row.deliveredAt
        ? new Date(row.deliveredAt).toISOString()
        : undefined,
      slaTargetAt: new Date(row.slaTargetAt).toISOString(),
      slaDeadlineAt: new Date(row.slaDeadlineAt).toISOString(),
    };
  }
}
