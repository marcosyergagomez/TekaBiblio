import {
  ConflictException,
  Injectable,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CopyStatus } from '../materials/materials.types';
import {
  LOAN_LIMIT_BY_LEVEL,
  MembershipLevel,
  RENEWAL_LIMIT_BY_LEVEL,
  evaluateBlockReasons,
  roundMoney,
} from './loan-policies';

type CreateLoanRiskInput = {
  membershipLevel: MembershipLevel;
  activeLoansCount: number;
  debtTotal: number;
  maxOverdueDays: number;
  overdueLoansLast60Days: number;
  memberId?: string;
  copyId?: string;
  pickupBranchId?: string;
};

type RenewalBlockers = {
  hasThirdPartyReservation: boolean;
  hasOutstandingDebt: boolean;
};

type RenewalContext = {
  loanId: string;
  status: 'ACTIVE' | 'RETURNED';
  membershipLevel: MembershipLevel;
  renewalCount: number;
};

@Injectable()
export class LoanDomainPolicyService {
  assertCreateLoanAllowed(input: CreateLoanRiskInput): void {
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
  }

  assertCopyAvailable(copyId: string, status: CopyStatus): void {
    if (status !== CopyStatus.AVAILABLE) {
      throw new ConflictException(
        `Copy ${copyId} is not available. Current status: ${status}`,
      );
    }
  }

  resolveCrossBranchShipment(
    forceCrossBranchShipment: boolean | undefined,
    sourceBranchId: string,
    pickupBranchId: string,
  ): boolean {
    return forceCrossBranchShipment ?? sourceBranchId !== pickupBranchId;
  }

  assertRenewalAllowed(
    context: RenewalContext,
    blockers: RenewalBlockers,
  ): void {
    if (context.status !== 'ACTIVE') {
      throw new ConflictException(
        `Only ACTIVE loans can be renewed. Current status: ${context.status}`,
      );
    }

    if (blockers.hasThirdPartyReservation) {
      throw new ConflictException(
        'Loan cannot be renewed because there is a third-party reservation',
      );
    }

    if (blockers.hasOutstandingDebt) {
      throw new ConflictException(
        'Loan cannot be renewed because member has outstanding debt',
      );
    }

    const maxRenewals = RENEWAL_LIMIT_BY_LEVEL[context.membershipLevel];
    if (context.renewalCount >= maxRenewals) {
      throw new ConflictException(
        `Renewal limit reached for ${context.membershipLevel}. Used: ${context.renewalCount}, limit: ${maxRenewals}`,
      );
    }
  }

  assertReturnAllowed(loanId: string, status: 'ACTIVE' | 'RETURNED'): void {
    if (status !== 'ACTIVE') {
      throw new ConflictException(`Loan ${loanId} is already returned`);
    }
  }

  computeOverdueDays(dueDate: Date, returnedAt: Date): number {
    const dayInMs = 24 * 60 * 60 * 1000;
    return Math.max(
      0,
      Math.ceil((returnedAt.getTime() - dueDate.getTime()) / dayInMs),
    );
  }

  getLevelAdjustment(level: MembershipLevel): number {
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
