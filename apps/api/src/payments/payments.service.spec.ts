import { ConflictException } from '@nestjs/common';
import { AuditRepository } from '../audit/audit.repository';
import { AuditService } from '../audit/audit.service';
import { LoansRepository } from '../loans/loans.repository';
import { LoansService } from '../loans/loans.service';
import { LoanDomainPolicyService } from '../loans/loan-domain-policy.service';
import { MaterialsRepository } from '../materials/materials.repository';
import { MaterialsService } from '../materials/materials.service';
import { UserRole } from '../auth/user-role.enum';
import { PenaltiesRepository } from '../penalties/penalties.repository';
import { PenaltiesService } from '../penalties/penalties.service';
import { PenaltyStatus, PenaltyType } from '../penalties/penalties.types';
import { ReservationsRepository } from '../reservations/reservations.repository';
import { PaymentsRepository } from './payments.repository';
import { PaymentsService } from './payments.service';
import { PaymentMethod } from './payments.types';

describe('PaymentsService', () => {
  let paymentsService: PaymentsService;
  let penaltiesService: PenaltiesService;

  beforeEach(() => {
    const materialsService = new MaterialsService(new MaterialsRepository());
    const loansService = new LoansService(
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
    paymentsService = new PaymentsService(
      new PaymentsRepository(),
      penaltiesService,
      auditService,
      loansService,
    );
  });

  it('registers a payment and marks penalty as paid', async () => {
    const penalty = await penaltiesService.createPenalty({
      memberId: 'member_payment',
      penaltyType: PenaltyType.DAMAGE,
      amount: 8,
      reason: 'Broken disk',
    });

    const payment = await paymentsService.registerPayment({
      memberId: 'member_payment',
      penaltyId: penalty.id,
      amount: 8,
      method: PaymentMethod.CARD,
    });

    const penalties = await penaltiesService.listPenalties({
      memberId: 'member_payment',
    });
    const updatedPenalty = penalties.items.find(
      (item) => item.id === penalty.id,
    );

    expect(payment.amount).toBe(8);
    expect(updatedPenalty?.status).toBe(PenaltyStatus.PAID);
  });

  it('does not mark a penalty paid when member or amount does not match', async () => {
    const penalty = await penaltiesService.createPenalty({
      memberId: 'member_payment',
      penaltyType: PenaltyType.DAMAGE,
      amount: 8,
      reason: 'Broken disk',
    });

    await expect(
      paymentsService.registerPayment({
        memberId: 'member_other',
        penaltyId: penalty.id,
        amount: 8,
      }),
    ).rejects.toThrow(ConflictException);

    await expect(
      paymentsService.registerPayment({
        memberId: 'member_payment',
        penaltyId: penalty.id,
        amount: 1,
      }),
    ).rejects.toThrow(ConflictException);

    const penalties = await penaltiesService.listPenalties({
      memberId: 'member_payment',
    });
    expect(penalties.items[0]?.status).toBe(PenaltyStatus.PENDING);
  });

  it('scopes payments to socio member in list', async () => {
    const penaltyA = await penaltiesService.createPenalty({
      memberId: 'member_a',
      penaltyType: PenaltyType.DAMAGE,
      amount: 3,
      reason: 'A',
    });
    const penaltyB = await penaltiesService.createPenalty({
      memberId: 'member_b',
      penaltyType: PenaltyType.DAMAGE,
      amount: 4,
      reason: 'B',
    });
    await paymentsService.registerPayment({
      memberId: 'member_a',
      penaltyId: penaltyA.id,
      amount: 3,
      method: PaymentMethod.SIMULATED,
    });

    await paymentsService.registerPayment({
      memberId: 'member_b',
      penaltyId: penaltyB.id,
      amount: 4,
      method: PaymentMethod.SIMULATED,
    });

    const scoped = await paymentsService.listPayments(
      {},
      {
        userId: 'u_member_a',
        role: UserRole.SOCIO,
        memberId: 'member_a',
      },
    );

    expect(scoped.items).toHaveLength(1);
    expect(scoped.items[0].memberId).toBe('member_a');
  });
});
