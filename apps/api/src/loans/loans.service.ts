import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MaterialsService } from '../materials/materials.service';
import { CopyStatus } from '../materials/materials.types';
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
  evaluateBlockReasons,
  getFinalPrice,
  getLateFee,
  getLoanDays,
  getShipmentFee,
  roundMoney,
} from './loan-policies';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
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

  async createLoan(input: CreateLoanDto): Promise<LoanRecord> {
    const blockReasons = evaluateBlockReasons({
      debtTotal: input.debtTotal,
      maxOverdueDays: input.maxOverdueDays,
      overdueLoansLast60Days: input.overdueLoansLast60Days,
    });

    if (blockReasons.length > 0) {
      throw new UnprocessableEntityException({
        message: 'Member is blocked by business rules',
        reasons: blockReasons,
      });
    }

    const loanLimit = LOAN_LIMIT_BY_LEVEL[input.membershipLevel];
    if (input.activeLoansCount >= loanLimit) {
      throw new ConflictException(
        `Loan limit reached for ${input.membershipLevel}. Active: ${input.activeLoansCount}, limit: ${loanLimit}`,
      );
    }

    const copy = await this.materialsService.getCopyOrThrow(input.copyId);
    const material = await this.materialsService.getMaterialOrThrow(
      copy.materialId,
    );

    if (copy.status !== CopyStatus.AVAILABLE) {
      throw new ConflictException(
        `Copy ${copy.id} is not available. Current status: ${copy.status}`,
      );
    }

    const crossBranchShipment =
      input.forceCrossBranchShipment ?? copy.branchId !== input.pickupBranchId;

    const startDate = input.startDate ? new Date(input.startDate) : new Date();
    const loanDays = getLoanDays(material.materialType, input.membershipLevel);
    const dueDate = this.addDays(startDate, loanDays);
    const basePrice = material.basePrice;
    const finalPrice = getFinalPrice(
      material.materialType,
      input.membershipLevel,
    );
    const shipmentFee = getShipmentFee(
      input.membershipLevel,
      crossBranchShipment,
    );

    const loan = await this.loansRepository.create({
      memberId: input.memberId,
      copyId: input.copyId,
      sourceBranchId: copy.branchId,
      pickupBranchId: input.pickupBranchId,
      materialType: material.materialType,
      membershipLevel: input.membershipLevel,
      startDate: startDate.toISOString(),
      dueDate: dueDate.toISOString(),
      renewalCount: 0,
      status: 'ACTIVE',
      crossBranchShipment,
      shipmentFee,
      basePrice,
      levelAdjustment: this.getLevelAdjustment(input.membershipLevel),
      finalPrice,
    });

    if (crossBranchShipment) {
      const now = new Date();

      await this.reservationsRepository.createShipment({
        loanId: loan.id,
        copyId: input.copyId,
        fromBranchId: copy.branchId,
        toBranchId: input.pickupBranchId,
        chargedFee: shipmentFee,
        requestedAt: now.toISOString(),
        slaTargetAt: this.addHours(now, SHIPMENT_TARGET_HOURS).toISOString(),
        slaDeadlineAt: this.addDays(now, SHIPMENT_DEADLINE_DAYS).toISOString(),
      });
    }

    await this.materialsService.updateCopyStatus(
      input.copyId,
      crossBranchShipment ? CopyStatus.IN_TRANSFER : CopyStatus.ON_LOAN,
    );
    return loan;
  }

  async listLoans(query: ListLoansDto): Promise<{
    items: LoanRecord[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;

    let items = await this.loansRepository.findAll();

    if (query.memberId) {
      items = items.filter((loan) => loan.memberId === query.memberId);
    }

    if (query.status) {
      items = items.filter((loan) => loan.status === query.status);
    }

    if (query.sourceBranchId) {
      items = items.filter(
        (loan) => loan.sourceBranchId === query.sourceBranchId,
      );
    }

    if (query.pickupBranchId) {
      items = items.filter(
        (loan) => loan.pickupBranchId === query.pickupBranchId,
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    };
  }

  async renewLoan(input: RenewLoanDto): Promise<LoanRecord> {
    const loan = await this.getLoanOrThrow(input.loanId);

    if (loan.status !== 'ACTIVE') {
      throw new ConflictException(
        `Only ACTIVE loans can be renewed. Current status: ${loan.status}`,
      );
    }

    if (input.hasThirdPartyReservation) {
      throw new ConflictException(
        'Loan cannot be renewed because there is a third-party reservation',
      );
    }

    if (input.hasOutstandingDebt) {
      throw new ConflictException(
        'Loan cannot be renewed because member has outstanding debt',
      );
    }

    const maxRenewals = RENEWAL_LIMIT_BY_LEVEL[loan.membershipLevel];
    if (loan.renewalCount >= maxRenewals) {
      throw new ConflictException(
        `Renewal limit reached for ${loan.membershipLevel}. Used: ${loan.renewalCount}, limit: ${maxRenewals}`,
      );
    }

    const currentDueDate = new Date(loan.dueDate);
    const extensionDays = getLoanDays(loan.materialType, loan.membershipLevel);
    const nextDueDate = this.addDays(currentDueDate, extensionDays);

    loan.renewalCount += 1;
    loan.dueDate = nextDueDate.toISOString();
    await this.loansRepository.save(loan);

    return loan;
  }

  async returnLoan(input: ReturnLoanDto): Promise<LoanRecord> {
    const loan = await this.getLoanOrThrow(input.loanId);

    if (loan.status !== 'ACTIVE') {
      throw new ConflictException(`Loan ${loan.id} is already returned`);
    }

    const returnedAt = input.returnedAt
      ? new Date(input.returnedAt)
      : new Date();
    const dueDate = new Date(loan.dueDate);
    const overdueDays = Math.max(
      0,
      Math.ceil((returnedAt.getTime() - dueDate.getTime()) / DAY_IN_MS),
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

    return loan;
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

  async findOne(loanId: string): Promise<LoanRecord> {
    return this.getLoanOrThrow(loanId);
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

  private getLevelAdjustment(level: MembershipLevel): number {
    switch (level) {
      case MembershipLevel.BRONCE:
        return 0;
      case MembershipLevel.PLATA:
        return -0.1;
      case MembershipLevel.ORO:
        return -0.2;
      default:
        return roundMoney(0);
    }
  }
}
