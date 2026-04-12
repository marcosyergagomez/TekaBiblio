import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { SqlStoreService } from '../database/sql-store.service';
import { PenaltyRecord, PenaltyStatus, PenaltyType } from './penalties.types';

type PenaltyRow = RowDataPacket & {
  id: string;
  memberId: string;
  loanId: string | null;
  reservationId: string | null;
  penaltyType: string;
  amount: number;
  status: string;
  reason: string;
  createdAt: Date | string;
};

@Injectable()
export class PenaltiesRepository {
  private readonly penalties = new Map<string, PenaltyRecord>();

  constructor(@Optional() private readonly sqlStore?: SqlStoreService) {}

  async create(
    input: Omit<PenaltyRecord, 'id' | 'createdAt' | 'status'>,
  ): Promise<PenaltyRecord> {
    const record: PenaltyRecord = {
      id: `pen_${randomUUID().slice(0, 8)}`,
      memberId: input.memberId,
      loanId: input.loanId,
      reservationId: input.reservationId,
      penaltyType: input.penaltyType,
      amount: input.amount,
      status: PenaltyStatus.PENDING,
      reason: input.reason,
      createdAt: new Date().toISOString(),
    };

    if (!this.isSqlEnabled()) {
      this.penalties.set(record.id, record);
      return record;
    }

    await this.sqlStore!.execute(
      `INSERT INTO penalties (id, member_id, loan_id, reservation_id, penalty_type, amount, status, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.memberId,
        record.loanId ?? null,
        record.reservationId ?? null,
        record.penaltyType,
        record.amount,
        record.status,
        record.reason,
      ],
    );

    return record;
  }

  async findById(penaltyId: string): Promise<PenaltyRecord | undefined> {
    if (!this.isSqlEnabled()) {
      return this.penalties.get(penaltyId);
    }

    const rows = await this.sqlStore!.query<PenaltyRow>(
      `SELECT
         id,
         member_id AS memberId,
         loan_id AS loanId,
         reservation_id AS reservationId,
         penalty_type AS penaltyType,
         amount,
         status,
         reason,
         created_at AS createdAt
       FROM penalties
       WHERE id = ?
       LIMIT 1`,
      [penaltyId],
    );

    const row = rows[0];
    return row ? this.mapRow(row) : undefined;
  }

  async getByIdOrThrow(penaltyId: string): Promise<PenaltyRecord> {
    const penalty = await this.findById(penaltyId);
    if (!penalty) {
      throw new NotFoundException(`Penalty ${penaltyId} not found`);
    }

    return penalty;
  }

  async save(penalty: PenaltyRecord): Promise<PenaltyRecord> {
    if (!this.isSqlEnabled()) {
      this.penalties.set(penalty.id, penalty);
      return penalty;
    }

    await this.sqlStore!.execute(
      `UPDATE penalties
       SET member_id = ?, loan_id = ?, reservation_id = ?, penalty_type = ?, amount = ?, status = ?, reason = ?
       WHERE id = ?`,
      [
        penalty.memberId,
        penalty.loanId ?? null,
        penalty.reservationId ?? null,
        penalty.penaltyType,
        penalty.amount,
        penalty.status,
        penalty.reason,
        penalty.id,
      ],
    );

    return penalty;
  }

  async list(): Promise<PenaltyRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.penalties.values());
    }

    const rows = await this.sqlStore!.query<PenaltyRow>(
      `SELECT
         id,
         member_id AS memberId,
         loan_id AS loanId,
         reservation_id AS reservationId,
         penalty_type AS penaltyType,
         amount,
         status,
         reason,
         created_at AS createdAt
       FROM penalties
       ORDER BY created_at DESC`,
    );

    return rows.map((row) => this.mapRow(row));
  }

  private isSqlEnabled(): boolean {
    return this.sqlStore?.isEnabled() ?? false;
  }

  private mapRow(row: PenaltyRow): PenaltyRecord {
    return {
      id: row.id,
      memberId: row.memberId,
      loanId: row.loanId ?? undefined,
      reservationId: row.reservationId ?? undefined,
      penaltyType: row.penaltyType as PenaltyType,
      amount: Number(row.amount),
      status: row.status as PenaltyStatus,
      reason: row.reason,
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }
}
