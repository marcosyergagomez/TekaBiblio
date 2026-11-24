import { Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { PaginatedResult, resolvePagination } from '../common/pagination';
import { WhereBuilder } from '../common/where-builder';
import {
  assertMemoryStoreIsTestOnly,
  SqlStoreService,
} from '../database/sql-store.service';
import { MembershipLevel } from './loan-policies';
import type { LoanRecord } from './loans.service';

export type LoanListFilters = {
  memberId?: string;
  status?: string;
  sourceBranchId?: string;
  pickupBranchId?: string;
  branchScopeId?: string;
  page?: number;
  pageSize?: number;
};

export type LoanReportFilters = {
  branchId?: string;
  from?: string;
  to?: string;
};

type CountRow = RowDataPacket & { total: number };

const LOAN_SELECT = `
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
  late_fee_amount AS lateFee
`;

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
  constructor(@Optional() private readonly sqlStore?: SqlStoreService) {
    assertMemoryStoreIsTestOnly(this.sqlStore, 'LoansRepository');
  }

  async lockMemberForCheckout(memberId: string): Promise<void> {
    if (!this.isSqlEnabled()) {
      return;
    }

    await this.sqlStore!.query(
      `SELECT id FROM members WHERE id = ? FOR UPDATE`,
      [memberId],
    );
    await this.sqlStore!.query(
      `SELECT id FROM loans WHERE member_id = ? AND status = 'ACTIVE' FOR UPDATE`,
      [memberId],
    );
  }

  async create(payload: Omit<LoanRecord, 'id'>): Promise<LoanRecord> {
    const loan: LoanRecord = {
      ...payload,
      id: randomUUID(),
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

  async deleteById(loanId: string): Promise<void> {
    if (!this.isSqlEnabled()) {
      this.loans.delete(loanId);
      return;
    }

    await this.sqlStore!.execute('DELETE FROM loans WHERE id = ?', [loanId]);
  }

  async countActiveByMember(memberId: string): Promise<number> {
    if (!this.isSqlEnabled()) {
      let total = 0;
      for (const loan of this.loans.values()) {
        if (loan.memberId === memberId && loan.status === 'ACTIVE') {
          total += 1;
        }
      }

      return total;
    }

    const rows = await this.sqlStore!.query<CountRow>(
      `SELECT COUNT(*) AS total
       FROM loans
       WHERE member_id = ? AND status = 'ACTIVE'`,
      [memberId],
    );
    return Number(rows[0]?.total ?? 0);
  }

  async findByMember(memberId: string): Promise<LoanRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.loans.values()).filter(
        (loan) => loan.memberId === memberId,
      );
    }

    const rows = await this.sqlStore!.query<LoanRow>(
      `SELECT ${LOAN_SELECT}
       FROM loans
       WHERE member_id = ?`,
      [memberId],
    );
    return rows.map((row) => this.mapRowToLoan(row));
  }

  async resolveMembershipLevel(
    memberId: string,
    requested: MembershipLevel,
  ): Promise<MembershipLevel> {
    if (!this.isSqlEnabled()) {
      return requested;
    }

    const rows = await this.sqlStore!.query<
      RowDataPacket & { membershipLevel: string }
    >(
      `SELECT membership_level AS membershipLevel
       FROM members
       WHERE id = ?
       LIMIT 1`,
      [memberId],
    );
    const level = rows[0]?.membershipLevel;
    if (!Object.values(MembershipLevel).includes(level as MembershipLevel)) {
      throw new NotFoundException(`Member ${memberId} not found`);
    }

    return level as MembershipLevel;
  }

  async search(filters: LoanListFilters): Promise<PaginatedResult<LoanRecord>> {
    const pagination = resolvePagination(filters, 20);
    if (!this.isSqlEnabled()) {
      const items = this.applyListFilters(
        Array.from(this.loans.values()),
        filters,
      ).sort((left, right) => right.startDate.localeCompare(left.startDate));
      const start = (pagination.page - 1) * pagination.pageSize;
      return {
        items: items.slice(start, start + pagination.pageSize),
        total: items.length,
        page: pagination.page,
        pageSize: pagination.pageSize,
      };
    }

    const where = this.listWhere(filters);
    const total = await this.countLoans(where);
    const rows = await this.sqlStore!.query<LoanRow>(
      `SELECT ${LOAN_SELECT}
       FROM loans
       ${where.sql()}
       ORDER BY starts_at DESC
       LIMIT ? OFFSET ?`,
      [
        ...where.values(),
        pagination.pageSize,
        (pagination.page - 1) * pagination.pageSize,
      ],
    );

    return {
      items: rows.map((row) => this.mapRowToLoan(row)),
      total,
      page: pagination.page,
      pageSize: pagination.pageSize,
    };
  }

  async findForReport(filters: LoanReportFilters): Promise<LoanRecord[]> {
    if (!this.isSqlEnabled()) {
      return Array.from(this.loans.values()).filter((loan) =>
        this.matchesReport(loan, filters),
      );
    }

    const where = new WhereBuilder();
    if (filters.branchId) {
      where.raw(
        '(source_branch_id = ? OR target_branch_id = ?)',
        filters.branchId,
        filters.branchId,
      );
    }

    if (filters.from) {
      where.raw(
        'starts_at >= ?',
        this.toMysqlDateTime(new Date(filters.from).toISOString()),
      );
    }

    if (filters.to) {
      where.raw(
        'starts_at <= ?',
        this.toMysqlDateTime(new Date(filters.to).toISOString()),
      );
    }

    const rows = await this.sqlStore!.query<LoanRow>(
      `SELECT ${LOAN_SELECT}
       FROM loans
       ${where.sql()}
       ORDER BY starts_at DESC`,
      where.values(),
    );
    return rows.map((row) => this.mapRowToLoan(row));
  }

  async memberRisk(memberId: string): Promise<{
    activeLoansCount: number;
    maxOverdueDays: number;
    overdueLoansLast60Days: number;
  }> {
    if (!this.isSqlEnabled()) {
      return this.memberRiskFromMemory(await this.findByMember(memberId));
    }

    const since = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const rows = await this.sqlStore!.query<
      RowDataPacket & {
        activeLoansCount: number;
        maxOverdueDays: number;
        overdueLoansLast60Days: number;
      }
    >(
      `SELECT
         COALESCE(SUM(status = 'ACTIVE'), 0) AS activeLoansCount,
         COALESCE(MAX(CASE
           WHEN status = 'ACTIVE'
           THEN GREATEST(0, CEILING(TIMESTAMPDIFF(SECOND, due_at, UTC_TIMESTAMP()) / 86400))
           ELSE 0
         END), 0) AS maxOverdueDays,
         COALESCE(SUM(
           status = 'RETURNED'
           AND late_fee_amount > 0
           AND returned_at >= ?
         ), 0) AS overdueLoansLast60Days
       FROM loans
       WHERE member_id = ?`,
      [this.toMysqlDateTime(since.toISOString()), memberId],
    );

    const row = rows[0];
    return {
      activeLoansCount: Number(row?.activeLoansCount ?? 0),
      maxOverdueDays: Number(row?.maxOverdueDays ?? 0),
      overdueLoansLast60Days: Number(row?.overdueLoansLast60Days ?? 0),
    };
  }

  async lockById(loanId: string): Promise<LoanRecord | undefined> {
    if (!this.isSqlEnabled()) {
      return this.loans.get(loanId);
    }

    const rows = await this.sqlStore!.query<LoanRow>(
      `SELECT ${LOAN_SELECT}
       FROM loans
       WHERE id = ?
       LIMIT 1
       FOR UPDATE`,
      [loanId],
    );
    const row = rows[0];
    return row ? this.mapRowToLoan(row) : undefined;
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

  private applyListFilters(
    items: LoanRecord[],
    filters: LoanListFilters,
  ): LoanRecord[] {
    return items.filter((loan) => {
      if (filters.memberId && loan.memberId !== filters.memberId) {
        return false;
      }

      if (filters.status && loan.status !== filters.status) {
        return false;
      }

      if (
        filters.sourceBranchId &&
        loan.sourceBranchId !== filters.sourceBranchId
      ) {
        return false;
      }

      if (
        filters.pickupBranchId &&
        loan.pickupBranchId !== filters.pickupBranchId
      ) {
        return false;
      }

      if (
        filters.branchScopeId &&
        loan.sourceBranchId !== filters.branchScopeId &&
        loan.pickupBranchId !== filters.branchScopeId
      ) {
        return false;
      }

      return true;
    });
  }

  private matchesReport(loan: LoanRecord, filters: LoanReportFilters): boolean {
    if (
      filters.branchId &&
      loan.sourceBranchId !== filters.branchId &&
      loan.pickupBranchId !== filters.branchId
    ) {
      return false;
    }

    const startsAt = new Date(loan.startDate).getTime();
    if (filters.from && startsAt < new Date(filters.from).getTime()) {
      return false;
    }

    if (filters.to && startsAt > new Date(filters.to).getTime()) {
      return false;
    }

    return true;
  }

  private listWhere(filters: LoanListFilters): WhereBuilder {
    const where = new WhereBuilder();
    where.eq('member_id', filters.memberId);
    where.eq('status', filters.status);
    where.eq('source_branch_id', filters.sourceBranchId);
    where.eq('target_branch_id', filters.pickupBranchId);
    if (filters.branchScopeId) {
      where.raw(
        '(source_branch_id = ? OR target_branch_id = ?)',
        filters.branchScopeId,
        filters.branchScopeId,
      );
    }

    return where;
  }

  private async countLoans(where: WhereBuilder): Promise<number> {
    const rows = await this.sqlStore!.query<CountRow>(
      `SELECT COUNT(*) AS total FROM loans ${where.sql()}`,
      where.values(),
    );
    return Number(rows[0]?.total ?? 0);
  }

  private resolveOverdueDays(row: LoanRow): number | undefined {
    if (!row.returnedAt) {
      return undefined;
    }

    const due = new Date(row.dueDate).getTime();
    const returned = new Date(row.returnedAt).getTime();
    if (Number.isNaN(due) || Number.isNaN(returned)) {
      return undefined;
    }

    const dayInMs = 24 * 60 * 60 * 1000;
    return Math.max(0, Math.ceil((returned - due) / dayInMs));
  }

  private memberRiskFromMemory(loans: LoanRecord[]): {
    activeLoansCount: number;
    maxOverdueDays: number;
    overdueLoansLast60Days: number;
  } {
    const now = Date.now();
    const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000;
    const dayInMs = 24 * 60 * 60 * 1000;
    let activeLoansCount = 0;
    let maxOverdueDays = 0;
    let overdueLoansLast60Days = 0;

    for (const loan of loans) {
      if (loan.status === 'ACTIVE') {
        activeLoansCount += 1;
        const overdue = Math.max(
          0,
          Math.ceil((now - new Date(loan.dueDate).getTime()) / dayInMs),
        );
        maxOverdueDays = Math.max(maxOverdueDays, overdue);
      }

      if (
        loan.status === 'RETURNED' &&
        loan.returnedAt &&
        (loan.overdueDays ?? 0) > 0 &&
        new Date(loan.returnedAt).getTime() >= sixtyDaysAgo
      ) {
        overdueLoansLast60Days += 1;
      }
    }

    return { activeLoansCount, maxOverdueDays, overdueLoansLast60Days };
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
      overdueDays: this.resolveOverdueDays(row),
      lateFee: row.lateFee !== null ? Number(row.lateFee) : undefined,
    };
  }
}
