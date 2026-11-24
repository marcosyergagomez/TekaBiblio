import { AuditRepository } from '../audit/audit.repository';
import { AuditService } from '../audit/audit.service';
import { LoansRepository } from '../loans/loans.repository';
import { LoansService } from '../loans/loans.service';
import { LoanDomainPolicyService } from '../loans/loan-domain-policy.service';
import { MaterialType, MembershipLevel } from '../loans/loan-policies';
import { MaterialsRepository } from '../materials/materials.repository';
import { MaterialsService } from '../materials/materials.service';
import { ReservationsRepository } from '../reservations/reservations.repository';
import { PenaltiesRepository } from './penalties.repository';
import { PenaltiesService } from './penalties.service';
import { PenaltyStatus, PenaltyType } from './penalties.types';

describe('PenaltiesService', () => {
  let penaltiesService: PenaltiesService;
  let materialsService: MaterialsService;
  let loansService: LoansService;

  beforeEach(() => {
    materialsService = new MaterialsService(new MaterialsRepository());
    loansService = new LoansService(
      new LoansRepository(),
      materialsService,
      new ReservationsRepository(),
      new LoanDomainPolicyService(),
    );
    const auditService = new AuditService(new AuditRepository());
    penaltiesService = new PenaltiesService(
      new PenaltiesRepository(),
      loansService,
      auditService,
    );
  });

  it('creates manual penalty as pending', async () => {
    const penalty = await penaltiesService.createPenalty({
      memberId: 'member_manual',
      penaltyType: PenaltyType.DAMAGE,
      amount: 12.5,
      reason: 'Damaged cover',
    });

    expect(penalty.status).toBe(PenaltyStatus.PENDING);
    expect(penalty.amount).toBe(12.5);
  });

  it('creates late penalty from returned loan with late fee', async () => {
    const material = await materialsService.createMaterial({
      title: 'Late Penalty Book',
      materialType: MaterialType.LIBRO,
      releaseDate: '2020-01-01',
      homeBranchId: 'branch_centro',
      basePrice: 2.5,
    });

    const copy = await materialsService.createCopy({
      materialId: material.id,
      branchId: 'branch_centro',
    });

    const thirtyDaysAgo = new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const loan = await loansService.createLoan({
      memberId: 'member_late',
      copyId: copy.id,
      pickupBranchId: 'branch_centro',
      membershipLevel: MembershipLevel.BRONCE,
      startDate: thirtyDaysAgo,
    });

    await loansService.returnLoan({
      loanId: loan.id,
      returnedAt: new Date().toISOString(),
    });

    const penalty = await penaltiesService.createPenaltyFromLoan({
      loanId: loan.id,
    });

    expect(penalty.penaltyType).toBe(PenaltyType.LATE_RETURN);
    expect(penalty.amount).toBeGreaterThan(0);
  });

  it('waives a pending penalty', async () => {
    const created = await penaltiesService.createPenalty({
      memberId: 'member_waive',
      penaltyType: PenaltyType.RESERVATION_EXPIRE,
      amount: 1,
      reason: 'Reservation expired',
    });

    const waived = await penaltiesService.waivePenalty(created.id, {
      reason: 'Manual override',
    });

    expect(waived.status).toBe(PenaltyStatus.WAIVED);
    expect(waived.reason).toBe('Manual override');
  });
});
