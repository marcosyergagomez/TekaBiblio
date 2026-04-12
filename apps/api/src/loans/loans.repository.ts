import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { SqlStoreService } from '../database/sql-store.service';
import type { LoanRecord } from './loans.service';

type LoanRow = RowDataPacket & {
  id: string;
  memberId: string;
  copyId: string;
  sourceBranchId: string;
  pickupBranchId: string;
  materialType: string;
  membershipLevel: string;
  startDate: Date | string;
  dueDate: Date | string;
  renewalCount: number;
  status: string;
  crossBranchShipment: number;
  shipmentFee: number;
  basePrice: number;
  levelAdjustment: number;
  finalPrice: number;
  returnedAt: Date | string | null;
  overdueDays: number | null;
  lateFee: number | null;
};

@Injectable()
export class LoansRepository {
  private readonly loans = new Map<string, LoanRecord>();
  constructor(@Optional() private readonly sqlStore?: SqlStoreService) {}

  async create(payload: Omit<LoanRecord, 'id'>): Promise<LoanRecord> {
    const loan: LoanRecord = {
      ...payload,
      id: `loan_${randomUUID().slice(0, 8)}`,
    };

    if (!this.isSqlEnabled()) {
      this.loans.set(loan.id, loan);
      return loan;
    }

    await this.sqlStore!.execute(
      `INSERT INTO loans (
        id, member_id, copy_id, source_branch_id, target_branch_id,
        membership_level, material_type, base_price, level_adjustment,
        final_price, shipment_fee, status, renewal_count, starts_at,
        due_at, returned_at, late_fee_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        loan.id,
        loan.memberId,
        loan.copyId,
        loan.sourceBranchId,
        loan.pickupBranchId,
        loan.membershipLevel,
        loan.materialType,
        loan.basePrice,
        loan.levelAdjustment,
        loan.finalPrice,
        loan.shipmentFee,
        loan.status,
        loan.renewalCount,
        this.toMysqlDateTime(loan.startDate),
        this.toMysqlDateTime(loan.dueDate),
        loan.returnedAt ? this.toMysqlDateTime(loan.returnedAt) : null,
        loan.lateFee ?? 0,
      ],
    );

    return loan;
  }

  async save(loan: LoanRecord): Promise<LoanRecord> {
    if (!this.isSqlEnabled()) {
      this.loans.set(loan.id, loan);
      return loan;
    }

    await this.sqlStore!.execute(
      `UPDATE loans
       SET member_id = ?, copy_id = ?, source_branch_id = ?, target_branch_id = ?,
           membership_level = ?, material_type = ?, base_price = ?, level_adjustment = ?,
           final_price = ?, shipment_fee = ?, status = ?, renewal_count = ?,
           starts_at = ?, due_at = ?, returned_at = ?, late_fee_amount = ?
       WHERE id = ?`,
      [
        loan.memberId,
        loan.copyId,
        loan.sourceBranchId,
        loan.pickupBranchId,
        loan.membershipLevel,
        loan.materialType,
        loan.basePrice,
        loan.levelAdjustment,
        loan.finalPrice,
        loan.shipmentFee,
        loan.status,
        loan.renewalCount,
        this.toMysqlDateTime(loan.startDate),
        this.toMysqlDateTime(loan.dueDate),
        loan.returnedAt ? this.toMysqlDateTime(loan.returnedAt) : null,
        loan.lateFee ?? 0,
        loan.id,
      ],
    );

    return loan;
  }

  async findById(loanId: string): Promise<LoanRecord | undefined> {
    if (!this.isSqlEnabled()) {
      return this.loans.get(loanId);
    }

    const rows = await this.sqlStore!.query<LoanRow>(
      `SELECT
          id,
          member_id AS memberId,
          copy_id AS copyId,
          source_branch_id AS sourceBranchId,
          target_branch_id AS pickupBranchId,
          material_type AS materialType,
          membership_level AS membershipLevel,
          starts_at AS startDate,
          due_at AS dueDate,
          renewal_count AS renewalCount,
          status,
          (source_branch_id <> target_branch_id) AS crossBranchShipment,
          shipment_fee AS shipmentFee,
          base_price AS basePrice,
          level_adjustment AS levelAdjustment,
          final_price AS finalPrice,
          returned_at AS returnedAt,
          NULL AS overdueDays,
          late_fee_amount AS lateFee
       FROM loans
       WHERE id = ?
       LIMIT 1`,
      [loanId],
    );

    const row = rows[0];
    if (!row) {
      return undefined;
    }

    return this.mapRowToLoan(row);
  }

  async findAll(): Promise<LoanRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.loans.values());
    }

    const rows = await this.sqlStore!.query<LoanRow>(
      `SELECT
          id,
          member_id AS memberId,
          copy_id AS copyId,
          source_branch_id AS sourceBranchId,
          target_branch_id AS pickupBranchId,
          material_type AS materialType,
          membership_level AS membershipLevel,
          starts_at AS startDate,
          due_at AS dueDate,
          renewal_count AS renewalCount,
          status,
          (source_branch_id <> target_branch_id) AS crossBranchShipment,
          shipment_fee AS shipmentFee,
          base_price AS basePrice,
          level_adjustment AS levelAdjustment,
          final_price AS finalPrice,
          returned_at AS returnedAt,
          NULL AS overdueDays,
          late_fee_amount AS lateFee
       FROM loans
       ORDER BY starts_at DESC`,
    );

    return rows.map((row) => this.mapRowToLoan(row));
  }

  private isSqlEnabled(): boolean {
    return this.sqlStore?.isEnabled() ?? false;
  }

  private toMysqlDateTime(value: string): string {
    return value.slice(0, 19).replace('T', ' ');
  }

  private mapRowToLoan(row: LoanRow): LoanRecord {
    return {
      id: row.id,
      memberId: row.memberId,
      copyId: row.copyId,
      sourceBranchId: row.sourceBranchId,
      pickupBranchId: row.pickupBranchId,
      materialType: row.materialType as LoanRecord['materialType'],
      membershipLevel: row.membershipLevel as LoanRecord['membershipLevel'],
      startDate: new Date(row.startDate).toISOString(),
      dueDate: new Date(row.dueDate).toISOString(),
      renewalCount: Number(row.renewalCount),
      status: row.status as LoanRecord['status'],
      crossBranchShipment: Boolean(row.crossBranchShipment),
      shipmentFee: Number(row.shipmentFee),
      basePrice: Number(row.basePrice),
      levelAdjustment: Number(row.levelAdjustment),
      finalPrice: Number(row.finalPrice),
      returnedAt: row.returnedAt
        ? new Date(row.returnedAt).toISOString()
        : undefined,
      overdueDays:
        row.overdueDays !== null ? Number(row.overdueDays) : undefined,
      lateFee: row.lateFee !== null ? Number(row.lateFee) : undefined,
    };
  }
}
