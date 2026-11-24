import { Injectable, Optional } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { WhereBuilder } from '../common/where-builder';
import { SqlStoreService } from '../database/sql-store.service';
import { LoanRecord, LoansService } from '../loans/loans.service';
import { MaterialsService } from '../materials/materials.service';
import { CopyStatus } from '../materials/materials.types';
import { PopularityReportDto } from './dto/popularity-report.dto';
import { ReportRangeDto } from './dto/report-range.dto';

type ScopedRange = {
  from?: string;
  to?: string;
  branchId?: string;
};

@Injectable()
export class ReportsService {
  constructor(
    private readonly loansService: LoansService,
    private readonly materialsService: MaterialsService,
    @Optional() private readonly sqlStore?: SqlStoreService,
  ) {}

  async getIncomeReport(query: ReportRangeDto, user?: RequestUser) {
    const scoped = this.scopeRange(query, user);
    if (this.sqlStore?.isEnabled()) {
      return this.incomeFromSql(scoped);
    }

    const loans = await this.getFilteredLoans(scoped);

    const totalBaseRevenue = this.roundMoney(
      loans.reduce((acc, item) => acc + item.finalPrice + item.shipmentFee, 0),
    );
    const totalLateFees = this.roundMoney(
      loans.reduce((acc, item) => acc + (item.lateFee ?? 0), 0),
    );

    const byMaterialType: Record<string, { loans: number; amount: number }> =
      {};

    for (const loan of loans) {
      const current = byMaterialType[loan.materialType] ?? {
        loans: 0,
        amount: 0,
      };
      current.loans += 1;
      current.amount = this.roundMoney(
        current.amount +
          loan.finalPrice +
          loan.shipmentFee +
          (loan.lateFee ?? 0),
      );
      byMaterialType[loan.materialType] = current;
    }

    return {
      filters: scoped,
      totals: {
        loans: loans.length,
        baseRevenue: totalBaseRevenue,
        lateFees: totalLateFees,
        totalRevenue: this.roundMoney(totalBaseRevenue + totalLateFees),
      },
      byMaterialType,
    };
  }

  async getLossesReport(query: ReportRangeDto, user?: RequestUser) {
    const scoped = this.scopeRange(query, user);
    if (this.sqlStore?.isEnabled()) {
      return this.lossesFromSql(scoped);
    }

    const copies = await this.materialsService.listCopies();
    const materials = await this.materialsService.listMaterials();
    const materialById = new Map(materials.map((item) => [item.id, item]));

    const lostCopies = copies.filter((copy) => {
      if (copy.status !== CopyStatus.LOST) {
        return false;
      }

      if (scoped.branchId && copy.branchId !== scoped.branchId) {
        return false;
      }

      return true;
    });

    const estimatedLossAmount = this.roundMoney(
      lostCopies.reduce((acc, copy) => {
        const material = materialById.get(copy.materialId);
        return acc + (material?.basePrice ?? 0);
      }, 0),
    );

    return {
      filters: scoped,
      totals: {
        lostCopies: lostCopies.length,
        estimatedLossAmount,
      },
      lostCopies,
    };
  }

  async getPopularityReport(query: PopularityReportDto, user?: RequestUser) {
    const scoped = this.scopeRange(query, user);
    const limit = query.limit ?? 5;
    if (this.sqlStore?.isEnabled()) {
      return this.popularityFromSql(scoped, limit);
    }

    const loans = await this.getFilteredLoans(scoped);
    const copies = await this.materialsService.listCopies();
    const materials = await this.materialsService.listMaterials();

    const copyToMaterial = new Map(
      copies.map((item) => [item.id, item.materialId]),
    );
    const materialById = new Map(materials.map((item) => [item.id, item]));
    const counts = new Map<string, number>();

    for (const loan of loans) {
      const materialId = copyToMaterial.get(loan.copyId);
      if (!materialId) {
        continue;
      }

      counts.set(materialId, (counts.get(materialId) ?? 0) + 1);
    }

    const ranking = Array.from(counts.entries())
      .map(([materialId, loanCount]) => {
        const material = materialById.get(materialId);

        return {
          materialId,
          title: material?.title ?? materialId,
          materialType: material?.materialType,
          loanCount,
        };
      })
      .sort(
        (a, b) => b.loanCount - a.loanCount || a.title.localeCompare(b.title),
      );

    return {
      filters: scoped,
      top: ranking.slice(0, limit),
      bottom: [...ranking].reverse().slice(0, limit),
    };
  }

  async getDashboard(query: PopularityReportDto, user?: RequestUser) {
    const [income, losses, popularity] = await Promise.all([
      this.getIncomeReport(query, user),
      this.getLossesReport(query, user),
      this.getPopularityReport(query, user),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      income,
      losses,
      popularity,
    };
  }

  private loanWhere(range: ScopedRange): WhereBuilder {
    const where = new WhereBuilder();
    if (range.branchId) {
      where.raw(
        '(source_branch_id = ? OR target_branch_id = ?)',
        range.branchId,
        range.branchId,
      );
    }

    if (range.from) {
      where.raw('starts_at >= ?', this.toMysqlDateTime(range.from));
    }

    if (range.to) {
      where.raw('starts_at <= ?', this.toMysqlDateTime(range.to));
    }

    return where;
  }

  private async incomeFromSql(scoped: ScopedRange) {
    const where = this.loanWhere(scoped);
    const totals = await this.sqlStore!.query<
      RowDataPacket & { loans: number; baseRevenue: number; lateFees: number }
    >(
      `SELECT COUNT(*) AS loans,
              COALESCE(SUM(final_price + shipment_fee), 0) AS baseRevenue,
              COALESCE(SUM(late_fee_amount), 0) AS lateFees
       FROM loans
       ${where.sql()}`,
      where.values(),
    );
    const grouped = await this.sqlStore!.query<
      RowDataPacket & { materialType: string; loans: number; amount: number }
    >(
      `SELECT material_type AS materialType,
              COUNT(*) AS loans,
              COALESCE(SUM(final_price + shipment_fee + late_fee_amount), 0) AS amount
       FROM loans
       ${where.sql()}
       GROUP BY material_type`,
      where.values(),
    );
    const row = totals[0];
    const baseRevenue = this.roundMoney(Number(row?.baseRevenue ?? 0));
    const lateFees = this.roundMoney(Number(row?.lateFees ?? 0));
    const byMaterialType: Record<string, { loans: number; amount: number }> =
      {};
    for (const item of grouped) {
      byMaterialType[item.materialType] = {
        loans: Number(item.loans),
        amount: this.roundMoney(Number(item.amount)),
      };
    }

    return {
      filters: scoped,
      totals: {
        loans: Number(row?.loans ?? 0),
        baseRevenue,
        lateFees,
        totalRevenue: this.roundMoney(baseRevenue + lateFees),
      },
      byMaterialType,
    };
  }

  private async lossesFromSql(scoped: ScopedRange) {
    const where = new WhereBuilder();
    where.eq('c.status', 'LOST');
    where.eq('c.branch_id', scoped.branchId);
    const rows = await this.sqlStore!.query<
      RowDataPacket & {
        id: string;
        materialId: string;
        branchId: string;
        status: string;
        basePrice: number;
      }
    >(
      `SELECT c.id AS id, c.material_id AS materialId, c.branch_id AS branchId,
              c.status AS status, m.base_price AS basePrice
       FROM copies c
       INNER JOIN materials m ON m.id = c.material_id
       ${where.sql()}`,
      where.values(),
    );
    const estimatedLossAmount = this.roundMoney(
      rows.reduce((acc, row) => acc + Number(row.basePrice), 0),
    );

    return {
      filters: scoped,
      totals: {
        lostCopies: rows.length,
        estimatedLossAmount,
      },
      lostCopies: rows.map((row) => ({
        id: row.id,
        materialId: row.materialId,
        branchId: row.branchId,
        status: row.status,
      })),
    };
  }

  private async popularityFromSql(scoped: ScopedRange, limit: number) {
    const where = this.loanWhere(scoped);
    const rows = await this.sqlStore!.query<
      RowDataPacket & {
        materialId: string;
        title: string;
        materialType: string;
        loanCount: number;
      }
    >(
      `SELECT m.id AS materialId, m.title AS title, m.material_type AS materialType,
              COUNT(*) AS loanCount
       FROM loans l
       INNER JOIN copies c ON c.id = l.copy_id
       INNER JOIN materials m ON m.id = c.material_id
       ${where.sql()}
       GROUP BY m.id, m.title, m.material_type
       ORDER BY loanCount DESC, m.title ASC`,
      where.values(),
    );
    const ranking = rows.map((row) => ({
      materialId: row.materialId,
      title: row.title,
      materialType: row.materialType,
      loanCount: Number(row.loanCount),
    }));

    return {
      filters: scoped,
      top: ranking.slice(0, limit),
      bottom: [...ranking].reverse().slice(0, limit),
    };
  }

  private toMysqlDateTime(value: string): string {
    const date = new Date(value);
    const iso = Number.isNaN(date.getTime()) ? value : date.toISOString();
    return iso.slice(0, 19).replace('T', ' ');
  }

  private async getFilteredLoans(range: ScopedRange): Promise<LoanRecord[]> {
    return this.loansService.listLoansInRange(range);
  }

  private scopeRange(query: ReportRangeDto, user?: RequestUser): ScopedRange {
    if (!user) {
      return {
        from: query.from,
        to: query.to,
        branchId: query.branchId,
      };
    }

    if (
      (user.role === UserRole.ADMIN_SEDE ||
        user.role === UserRole.BIBLIOTECARIO) &&
      user.branchId
    ) {
      return {
        from: query.from,
        to: query.to,
        branchId: user.branchId,
      };
    }

    return {
      from: query.from,
      to: query.to,
      branchId: query.branchId,
    };
  }

  private roundMoney(value: number): number {
    return Number(value.toFixed(2));
  }
}
