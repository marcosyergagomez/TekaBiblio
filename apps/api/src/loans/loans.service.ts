import {
  Inject,
  Injectable,
  NotFoundException,
  Optional,
  UnprocessableEntityException,
  forwardRef,
} from '@nestjs/common';
import { RequestUser } from '../auth/user-role.enum';
import {
  assertBranchFilter,
  branchScopeId,
  enforceBranchScope,
  enforceMemberScope,
  scopedMemberFilter,
} from '../common/access-scope';
import { SqlStoreService } from '../database/sql-store.service';
import { MaterialsService } from '../materials/materials.service';
import { CopyStatus } from '../materials/materials.types';
import { PenaltiesRepository } from '../penalties/penalties.repository';
import { PenaltyType } from '../penalties/penalties.types';
import { CalculateLateFeeDto } from './dto/calculate-late-fee.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ListLoansDto } from './dto/list-loans.dto';
import { RenewLoanDto } from './dto/renew-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { LoansRepository } from './loans.repository';
import { ReservationsRepository } from '../reservations/reservations.repository';
import {
  BASE_PRICE_BY_TYPE,
  LOAN_DAYS_BY_TYPE_LEVEL,
  LOAN_LIMIT_BY_LEVEL,
  LATE_FEE_CAP_BY_TYPE,
  LATE_FEE_DAILY_BY_TYPE,
  MembershipLevel,
  MaterialType,
  RENEWAL_LIMIT_BY_LEVEL,
  SHIPMENT_FEE_BY_LEVEL,
  getLateFee,
  getLoanDays,
  getShipmentFee,
  roundMoney,
} from './loan-policies';
import { LoanDomainPolicyService } from './loan-domain-policy.service';

const SHIPMENT_TARGET_HOURS = 48;
const SHIPMENT_DEADLINE_DAYS = 3;

export type LoanStatus = 'ACTIVE' | 'RETURNED';

export type LoanRecord = {
  id: string;
  memberId: string;
  copyId: string;
  sourceBranchId: string;
  pickupBranchId: string;
  materialType: MaterialType;
  membershipLevel: MembershipLevel;
  startDate: string;
  dueDate: string;
  renewalCount: number;
  status: LoanStatus;
  crossBranchShipment: boolean;
  shipmentFee: number;
  basePrice: number;
  levelAdjustment: number;
  finalPrice: number;
  returnedAt?: string;
  overdueDays?: number;
  lateFee?: number;
};

export type LoanPoliciesSnapshot = {
  loanDaysByTypeLevel: typeof LOAN_DAYS_BY_TYPE_LEVEL;
  basePriceByType: typeof BASE_PRICE_BY_TYPE;
  levelPriceAdjustment: Record<MembershipLevel, number>;
  loanLimitByLevel: typeof LOAN_LIMIT_BY_LEVEL;
  renewalLimitByLevel: typeof RENEWAL_LIMIT_BY_LEVEL;
  lateFeeDailyByType: typeof LATE_FEE_DAILY_BY_TYPE;
  lateFeeCapByType: typeof LATE_FEE_CAP_BY_TYPE;
  shipmentFeeByLevel: typeof SHIPMENT_FEE_BY_LEVEL;
};

@Injectable()
export class LoansService {
  constructor(
    private readonly loansRepository: LoansRepository,
    private readonly materialsService: MaterialsService,
    private readonly reservationsRepository: ReservationsRepository,
    private readonly loanDomainPolicyService: LoanDomainPolicyService,
    @Optional()
    @Inject(forwardRef(() => PenaltiesRepository))
    private readonly penaltiesRepository?: PenaltiesRepository,
    @Optional() private readonly sqlStore?: SqlStoreService,
  ) {}

  getPolicies(): LoanPoliciesSnapshot {
    return {
      loanDaysByTypeLevel: LOAN_DAYS_BY_TYPE_LEVEL,
      basePriceByType: BASE_PRICE_BY_TYPE,
      levelPriceAdjustment: {
        BRONCE: 0,
        PLATA: -0.1,
        ORO: -0.2,
      },
      loanLimitByLevel: LOAN_LIMIT_BY_LEVEL,
      renewalLimitByLevel: RENEWAL_LIMIT_BY_LEVEL,
      lateFeeDailyByType: LATE_FEE_DAILY_BY_TYPE,
      lateFeeCapByType: LATE_FEE_CAP_BY_TYPE,
      shipmentFeeByLevel: SHIPMENT_FEE_BY_LEVEL,
    };
  }

  async createLoan(
    input: CreateLoanDto,
    user?: RequestUser,
  ): Promise<LoanRecord> {
    enforceBranchScope(user, [input.pickupBranchId]);
    return this.inTransaction(() => this.openLoan(input));
  }

  private async openLoan(input: CreateLoanDto): Promise<LoanRecord> {
    await this.loansRepository.lockMemberForCheckout(input.memberId);
    const copy = await this.materialsService.lockCopy(input.copyId);
    const material = await this.materialsService.getMaterialOrThrow(
      copy.materialId,
    );
    this.loanDomainPolicyService.assertCopyAvailable(copy.id, copy.status);

    const membershipLevel = await this.loansRepository.resolveMembershipLevel(
      input.memberId,
      input.membershipLevel,
    );
    const risk = await this.buildMemberRisk(input.memberId);
    this.loanDomainPolicyService.assertCreateLoanAllowed({
      membershipLevel,
      ...risk,
    });

    const crossBranchShipment =
      this.loanDomainPolicyService.resolveCrossBranchShipment(
        input.forceCrossBranchShipment,
        copy.branchId,
        input.pickupBranchId,
      );
    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    if (Number.isNaN(startDate.getTime())) {
      throw new UnprocessableEntityException('Invalid start date');
    }

    const loanDays = getLoanDays(material.materialType, membershipLevel);
    const dueDate = this.addDays(startDate, loanDays);
    const levelAdjustment =
      this.loanDomainPolicyService.getLevelAdjustment(membershipLevel);
    const finalPrice = roundMoney(material.basePrice * (1 + levelAdjustment));
    const shipmentFee = getShipmentFee(membershipLevel, crossBranchShipment);
    const nextCopyStatus = crossBranchShipment
      ? CopyStatus.IN_TRANSFER
      : CopyStatus.ON_LOAN;

    await this.materialsService.claimAvailableCopy(
      input.copyId,
      nextCopyStatus,
    );
    const loan = await this.loansRepository.create({
      memberId: input.memberId,
      copyId: input.copyId,
      sourceBranchId: copy.branchId,
      pickupBranchId: input.pickupBranchId,
      materialType: material.materialType,
      membershipLevel,
      startDate: startDate.toISOString(),
      dueDate: dueDate.toISOString(),
      renewalCount: 0,
      status: 'ACTIVE',
      crossBranchShipment,
      shipmentFee,
      basePrice: material.basePrice,
      levelAdjustment,
      finalPrice,
    });

    if (!crossBranchShipment) {
      return loan;
    }

    const now = new Date();
    try {
      await this.reservationsRepository.createShipment({
        loanId: loan.id,
        memberId: input.memberId,
        copyId: input.copyId,
        fromBranchId: copy.branchId,
        toBranchId: input.pickupBranchId,
        chargedFee: shipmentFee,
        requestedAt: now.toISOString(),
        slaTargetAt: this.addHours(now, SHIPMENT_TARGET_HOURS).toISOString(),
        slaDeadlineAt: this.addDays(now, SHIPMENT_DEADLINE_DAYS).toISOString(),
      });
    } catch (error) {
      if (!this.sqlStore?.isEnabled()) {
        await this.materialsService.updateCopyStatus(
          input.copyId,
          CopyStatus.AVAILABLE,
        );
        await this.loansRepository.deleteById(loan.id);
      }
      throw error;
    }

    return loan;
  }

  async listLoans(query: ListLoansDto, user?: RequestUser) {
    assertBranchFilter(user, query.sourceBranchId);
    assertBranchFilter(user, query.pickupBranchId);
    return this.loansRepository.search({
      ...query,
      memberId: scopedMemberFilter(user, query.memberId),
      branchScopeId: branchScopeId(user),
    });
  }

  async listLoansInRange(range: {
    from?: string;
    to?: string;
    branchId?: string;
  }): Promise<LoanRecord[]> {
    return this.loansRepository.findForReport(range);
  }

  async renewLoan(
    input: RenewLoanDto,
    user?: RequestUser,
  ): Promise<LoanRecord> {
    return this.inTransaction(async () => {
      const loan = await this.loansRepository.lockById(input.loanId);
      if (!loan) {
        throw new NotFoundException(`Loan ${input.loanId} not found`);
      }

      enforceMemberScope(user, loan.memberId);
      enforceBranchScope(user, [loan.sourceBranchId, loan.pickupBranchId]);
      const copy = await this.materialsService.getCopyOrThrow(loan.copyId);
      await this.reservationsRepository.lockActiveForMaterial(copy.materialId);
      const hasThirdPartyReservation =
        await this.reservationsRepository.hasActiveReservationByOtherMember(
          copy.materialId,
          loan.memberId,
        );
      const debtTotal = await this.pendingDebt(loan.memberId);
      this.loanDomainPolicyService.assertRenewalAllowed(
        {
          loanId: loan.id,
          status: loan.status,
          membershipLevel: loan.membershipLevel,
          renewalCount: loan.renewalCount,
        },
        {
          hasThirdPartyReservation,
          hasOutstandingDebt: debtTotal > 0,
        },
      );

      const currentDueDate = new Date(loan.dueDate);
      const extensionDays = getLoanDays(
        loan.materialType,
        loan.membershipLevel,
      );
      const nextDueDate = this.addDays(currentDueDate, extensionDays);

      loan.renewalCount += 1;
      loan.dueDate = nextDueDate.toISOString();
      await this.loansRepository.save(loan);
      return loan;
    });
  }

  async returnLoan(
    input: ReturnLoanDto,
    user?: RequestUser,
  ): Promise<LoanRecord> {
    return this.inTransaction(async () => {
      const loan = await this.loansRepository.lockById(input.loanId);
      if (!loan) {
        throw new NotFoundException(`Loan ${input.loanId} not found`);
      }

      enforceMemberScope(user, loan.memberId);
      enforceBranchScope(user, [loan.sourceBranchId, loan.pickupBranchId]);
      this.loanDomainPolicyService.assertReturnAllowed(loan.id, loan.status);

      const returnedAt = input.returnedAt
        ? new Date(input.returnedAt)
        : new Date();
      const dueDate = new Date(loan.dueDate);
      const overdueDays = this.loanDomainPolicyService.computeOverdueDays(
        dueDate,
        returnedAt,
      );
      const lateFee = getLateFee(loan.materialType, overdueDays);

      loan.status = 'RETURNED';
      loan.returnedAt = returnedAt.toISOString();
      loan.overdueDays = overdueDays;
      loan.lateFee = lateFee;
      await this.materialsService.updateCopyStatus(
        loan.copyId,
        CopyStatus.AVAILABLE,
      );
      await this.loansRepository.save(loan);

      if (lateFee > 0 && this.penaltiesRepository) {
        const alreadyCharged =
          await this.penaltiesRepository.hasOpenLatePenalty(loan.id);
        if (!alreadyCharged) {
          await this.penaltiesRepository.create({
            memberId: loan.memberId,
            loanId: loan.id,
            penaltyType: PenaltyType.LATE_RETURN,
            amount: lateFee,
            reason: `Late return for loan ${loan.id}`,
          });
        }
      }

      return loan;
    });
  }

  calculateLateFee(input: CalculateLateFeeDto): {
    materialType: MaterialType;
    overdueDays: number;
    lateFee: number;
  } {
    return {
      materialType: input.materialType,
      overdueDays: input.overdueDays,
      lateFee: getLateFee(input.materialType, input.overdueDays),
    };
  }

  async findOne(loanId: string, user?: RequestUser): Promise<LoanRecord> {
    const loan = await this.getLoanOrThrow(loanId);
    enforceMemberScope(user, loan.memberId);
    enforceBranchScope(user, [loan.sourceBranchId, loan.pickupBranchId]);
    return loan;
  }

  private async buildMemberRisk(memberId: string): Promise<{
    activeLoansCount: number;
    debtTotal: number;
    maxOverdueDays: number;
    overdueLoansLast60Days: number;
  }> {
    const risk = await this.loansRepository.memberRisk(memberId);
    return {
      ...risk,
      debtTotal: await this.pendingDebt(memberId),
    };
  }

  private inTransaction<T>(work: () => Promise<T>): Promise<T> {
    if (this.sqlStore?.isEnabled()) {
      return this.sqlStore.transaction(work);
    }

    return work();
  }

  private async pendingDebt(memberId: string): Promise<number> {
    if (!this.penaltiesRepository) {
      return 0;
    }

    return this.penaltiesRepository.sumPendingByMember(memberId);
  }

  private async getLoanOrThrow(loanId: string): Promise<LoanRecord> {
    const loan = await this.loansRepository.findById(loanId);
    if (!loan) {
      throw new NotFoundException(`Loan ${loanId} not found`);
    }

    return loan;
  }

  private addDays(date: Date, days: number): Date {
    const next = new Date(date);
    next.setUTCDate(next.getUTCDate() + days);
    return next;
  }

  private addHours(date: Date, hours: number): Date {
    return new Date(date.getTime() + hours * 60 * 60 * 1000);
  }
}
