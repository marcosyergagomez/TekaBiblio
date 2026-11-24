import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { WhereBuilder } from '../common/where-builder';
import { SqlStoreService } from '../database/sql-store.service';
import { PaymentMethod, PaymentRecord, PaymentStatus } from './payments.types';

type PaymentListFilters = {
  memberId?: string;
  memberHomeBranchId?: string;
};

type PaymentRow = RowDataPacket & {
  id: string;
  memberId: string;
  loanId: string | null;
  penaltyId: string | null;
  amount: number;
  method: string;
  status: string;
  paidAt: Date | string;
};

@Injectable()
export class PaymentsRepository {
  private readonly payments = new Map<string, PaymentRecord>();

  constructor(@Optional() private readonly sqlStore?: SqlStoreService) {}

  async create(
    input: Omit<PaymentRecord, 'id' | 'paidAt' | 'status'>,
  ): Promise<PaymentRecord> {
    const payment: PaymentRecord = {
      id: randomUUID(),
      memberId: input.memberId,
      loanId: input.loanId,
      penaltyId: input.penaltyId,
      amount: input.amount,
      method: input.method,
      status: PaymentStatus.PAID,
      paidAt: new Date().toISOString(),
    };

    if (!this.isSqlEnabled()) {
      this.payments.set(payment.id, payment);
      return payment;
    }

    await this.sqlStore!.execute(
      `INSERT INTO payments (id, member_id, loan_id, penalty_id, amount, method, status, paid_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payment.id,
        payment.memberId,
        payment.loanId ?? null,
        payment.penaltyId ?? null,
        payment.amount,
        payment.method,
        payment.status,
        this.toMysqlDateTime(payment.paidAt),
      ],
    );

    return payment;
  }

  async list(filters: PaymentListFilters = {}): Promise<PaymentRecord[]> {
    if (!this.isSqlEnabled()) {
      if (filters.memberHomeBranchId) {
        return [];
      }

      return Array.from(this.payments.values()).filter((payment) => {
        return !filters.memberId || payment.memberId === filters.memberId;
      });
    }

    const where = new WhereBuilder();
    where.eq('p.member_id', filters.memberId);
    where.eq('m.home_branch_id', filters.memberHomeBranchId);
    const rows = await this.sqlStore!.query<PaymentRow>(
      `SELECT
         p.id AS id,
         p.member_id AS memberId,
         p.loan_id AS loanId,
         p.penalty_id AS penaltyId,
         p.amount AS amount,
         p.method AS method,
         p.status AS status,
         p.paid_at AS paidAt
       FROM payments p
       LEFT JOIN members m ON m.id = p.member_id
       ${where.sql()}
       ORDER BY p.paid_at DESC`,
      where.values(),
    );

    return rows.map((row) => ({
      id: row.id,
      memberId: row.memberId,
      loanId: row.loanId ?? undefined,
      penaltyId: row.penaltyId ?? undefined,
      amount: Number(row.amount),
      method: row.method as PaymentMethod,
      status: row.status as PaymentStatus,
      paidAt: new Date(row.paidAt).toISOString(),
    }));
  }

  private isSqlEnabled(): boolean {
    return this.sqlStore?.isEnabled() ?? false;
  }

  private toMysqlDateTime(value: string): string {
    return value.slice(0, 19).replace('T', ' ');
  }
}
