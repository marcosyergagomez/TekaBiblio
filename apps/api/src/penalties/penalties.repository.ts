import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { WhereBuilder } from '../common/where-builder';
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
      id: randomUUID(),
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

  async sumPendingByMember(memberId: string): Promise<number> {
    if (!this.isSqlEnabled()) {
      let total = 0;
      for (const penalty of this.penalties.values()) {
        if (
          penalty.memberId === memberId &&
          penalty.status === PenaltyStatus.PENDING
        ) {
          total += penalty.amount;
        }
      }

      return Number(total.toFixed(2));
    }

    const rows = await this.sqlStore!.query<RowDataPacket & { total: number }>(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM penalties
       WHERE member_id = ? AND status = ?`,
      [memberId, PenaltyStatus.PENDING],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async hasOpenLatePenalty(loanId: string): Promise<boolean> {
    if (!this.isSqlEnabled()) {
      for (const penalty of this.penalties.values()) {
        if (
          penalty.loanId === loanId &&
          penalty.penaltyType === PenaltyType.LATE_RETURN &&
          penalty.status !== PenaltyStatus.WAIVED
        ) {
          return true;
        }
      }

      return false;
    }

    const rows = await this.sqlStore!.query<RowDataPacket>(
      `SELECT id
       FROM penalties
       WHERE loan_id = ? AND penalty_type = ? AND status <> ?
       LIMIT 1`,
      [loanId, PenaltyType.LATE_RETURN, PenaltyStatus.WAIVED],
    );
    return rows.length > 0;
  }

  async markPaidIfPending(
    penaltyId: string,
  ): Promise<PenaltyRecord | undefined> {
    if (!this.isSqlEnabled()) {
      const penalty = this.penalties.get(penaltyId);
      if (!penalty || penalty.status !== PenaltyStatus.PENDING) {
        return undefined;
      }

      penalty.status = PenaltyStatus.PAID;
      this.penalties.set(penaltyId, penalty);
      return penalty;
    }

    const result = await this.sqlStore!.execute(
      `UPDATE penalties
       SET status = ?
       WHERE id = ? AND status = ?`,
      [PenaltyStatus.PAID, penaltyId, PenaltyStatus.PENDING],
    );
    if (result.affectedRows !== 1) {
      return undefined;
    }

    return this.findById(penaltyId);
  }

  async list(
    filters: { memberId?: string; memberHomeBranchId?: string } = {},
  ): Promise<PenaltyRecord[]> {
    if (!this.isSqlEnabled()) {
      if (filters.memberHomeBranchId) {
        return [];
      }

      return Array.from(this.penalties.values()).filter((penalty) => {
        return !filters.memberId || penalty.memberId === filters.memberId;
      });
    }

    const where = new WhereBuilder();
    where.eq('p.member_id', filters.memberId);
    where.eq('m.home_branch_id', filters.memberHomeBranchId);

    const rows = await this.sqlStore!.query<PenaltyRow>(
      `SELECT
         p.id AS id,
         p.member_id AS memberId,
         p.loan_id AS loanId,
         p.reservation_id AS reservationId,
         p.penalty_type AS penaltyType,
         p.amount AS amount,
         p.status AS status,
         p.reason AS reason,
         p.created_at AS createdAt
       FROM penalties p
       LEFT JOIN members m ON m.id = p.member_id
       ${where.sql()}
       ORDER BY p.created_at DESC`,
      where.values(),
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
