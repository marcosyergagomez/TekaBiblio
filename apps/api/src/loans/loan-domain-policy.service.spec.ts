import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CopyStatus } from '../materials/materials.types';
import { MembershipLevel } from './loan-policies';
import { LoanDomainPolicyService } from './loan-domain-policy.service';

describe('LoanDomainPolicyService', () => {
  const policy = new LoanDomainPolicyService();

  it('blocks create loan when member is blocked by debt rules', () => {
    expect(() =>
      policy.assertCreateLoanAllowed({
        memberId: 'member_1',
        copyId: 'copy_1',
        pickupBranchId: 'branch_centro',
        membershipLevel: MembershipLevel.BRONCE,
        activeLoansCount: 0,
        debtTotal: 20,
        maxOverdueDays: 0,
        overdueLoansLast60Days: 0,
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('blocks create loan when copy status is not available', () => {
    expect(() =>
      policy.assertCopyAvailable('copy_1', CopyStatus.ON_LOAN),
    ).toThrow(ConflictException);
  });

  it('computes cross branch shipment from branch mismatch when force is undefined', () => {
    expect(
      policy.resolveCrossBranchShipment(
        undefined,
        'branch_norte',
        'branch_sur',
      ),
    ).toBe(true);
    expect(
      policy.resolveCrossBranchShipment(
        undefined,
        'branch_norte',
        'branch_norte',
      ),
    ).toBe(false);
  });

  it('computes overdue days with ceil strategy', () => {
    const due = new Date('2026-04-01T10:00:00.000Z');
    const returned = new Date('2026-04-03T09:00:00.000Z');

    expect(policy.computeOverdueDays(due, returned)).toBe(2);
  });
});
