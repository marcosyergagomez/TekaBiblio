import { LoansRepository } from '../loans/loans.repository';
import { LoansService } from '../loans/loans.service';
import { MaterialType, MembershipLevel } from '../loans/loan-policies';
import { MaterialsRepository } from '../materials/materials.repository';
import { MaterialsService } from '../materials/materials.service';
import { CopyStatus } from '../materials/materials.types';
import { ReservationsRepository } from '../reservations/reservations.repository';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  let reportsService: ReportsService;
  let materialsService: MaterialsService;
  let loansService: LoansService;

  beforeEach(() => {
    materialsService = new MaterialsService(new MaterialsRepository());
    loansService = new LoansService(
      new LoansRepository(),
      materialsService,
      new ReservationsRepository(),
    );
    reportsService = new ReportsService(loansService, materialsService);
  });

  async function createLoanForMaterial(
    materialType: MaterialType,
    title: string,
  ) {
    const material = await materialsService.createMaterial({
      title,
      materialType,
      releaseDate: '2024-01-01',
      homeBranchId: 'branch_centro',
      basePrice: materialType === MaterialType.LIBRO ? 2.5 : 3.5,
    });

    const copy = await materialsService.createCopy({
      materialId: material.id,
      branchId: 'branch_centro',
    });

    const loan = await loansService.createLoan({
      memberId: 'member_1',
      copyId: copy.id,
      pickupBranchId: 'branch_centro',
      membershipLevel: MembershipLevel.BRONCE,
      activeLoansCount: 0,
      debtTotal: 0,
      maxOverdueDays: 0,
      overdueLoansLast60Days: 0,
    });

    return { material, copy, loan };
  }

  it('builds income and popularity snapshots from loans', async () => {
    const first = await createLoanForMaterial(MaterialType.LIBRO, 'Top Book');

    const secondCopySameMaterial = await materialsService.createCopy({
      materialId: first.material.id,
      branchId: 'branch_centro',
    });

    await loansService.createLoan({
      memberId: 'member_2',
      copyId: secondCopySameMaterial.id,
      pickupBranchId: 'branch_centro',
      membershipLevel: MembershipLevel.BRONCE,
      activeLoansCount: 0,
      debtTotal: 0,
      maxOverdueDays: 0,
      overdueLoansLast60Days: 0,
    });

    await createLoanForMaterial(MaterialType.PELICULA, 'Other Movie');

    const income = await reportsService.getIncomeReport({});
    const popularity = await reportsService.getPopularityReport({ limit: 2 });

    expect(income.totals.loans).toBe(3);
    expect(income.totals.totalRevenue).toBeGreaterThan(0);
    expect(popularity.top[0].materialId).toBe(first.material.id);
    expect(popularity.top[0].loanCount).toBe(2);
  });

  it('reports lost copies as estimated losses', async () => {
    const lostCandidate = await createLoanForMaterial(
      MaterialType.PELICULA,
      'Lost Movie',
    );
    await materialsService.updateCopyStatus(
      lostCandidate.copy.id,
      CopyStatus.LOST,
    );

    const losses = await reportsService.getLossesReport({});

    expect(losses.totals.lostCopies).toBe(1);
    expect(losses.totals.estimatedLossAmount).toBe(3.5);
  });
});
