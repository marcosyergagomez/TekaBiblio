import { Injectable } from '@nestjs/common';
import { RequestUser, UserRole } from '../auth/user-role.enum';
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
  ) {}

  async getIncomeReport(query: ReportRangeDto, user?: RequestUser) {
    const scoped = this.scopeRange(query, user);
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

  private async getFilteredLoans(range: ScopedRange): Promise<LoanRecord[]> {
    const result = await this.loansService.listLoans({
      page: 1,
      pageSize: 100000,
    });

    return result.items.filter((loan) => {
      if (
        range.branchId &&
        loan.sourceBranchId !== range.branchId &&
        loan.pickupBranchId !== range.branchId
      ) {
        return false;
      }

      const startsAt = new Date(loan.startDate).getTime();

      if (range.from && startsAt < new Date(range.from).getTime()) {
        return false;
      }

      if (range.to && startsAt > new Date(range.to).getTime()) {
        return false;
      }

      return true;
    });
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
