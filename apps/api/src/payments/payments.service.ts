import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { branchScopeId, scopedMemberFilter } from '../common/access-scope';
import { paginateFromQuery } from '../common/pagination';
import { LoansService } from '../loans/loans.service';
import { roundMoney } from '../loans/loan-policies';
import { PenaltiesService } from '../penalties/penalties.service';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { PaymentsRepository } from './payments.repository';
import { PaymentMethod, PaymentRecord } from './payments.types';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly penaltiesService: PenaltiesService,
    private readonly auditService: AuditService,
    private readonly loansService: LoansService,
  ) {}

  async registerPayment(input: RegisterPaymentDto, actor?: RequestUser) {
    if (input.amount <= 0) {
      throw new ConflictException('Payment amount must be greater than zero');
    }

    if (!input.loanId && !input.penaltyId) {
      throw new ConflictException('Payment must reference loanId or penaltyId');
    }

    if (input.loanId) {
      const loan = await this.loansService.findOne(input.loanId);
      if (loan.memberId !== input.memberId) {
        throw new ConflictException(
          'Loan member does not match payment member',
        );
      }
    }

    if (input.penaltyId) {
      const penalty = await this.penaltiesService.getPenaltyOrThrow(
        input.penaltyId,
      );
      if (penalty.memberId !== input.memberId) {
        throw new ConflictException(
          'Penalty member does not match payment member',
        );
      }

      if (roundMoney(penalty.amount) !== roundMoney(input.amount)) {
        throw new ConflictException(
          'Payment amount must match the pending penalty amount',
        );
      }

      const paid = await this.penaltiesService.markPendingPenaltyPaid(
        input.penaltyId,
        actor,
      );
      if (!paid) {
        throw new ConflictException('Only PENDING penalties can be paid');
      }
    }

    let payment: PaymentRecord;
    try {
      payment = await this.paymentsRepository.create({
        memberId: input.memberId,
        loanId: input.loanId,
        penaltyId: input.penaltyId,
        amount: input.amount,
        method: input.method ?? PaymentMethod.SIMULATED,
      });
    } catch (error) {
      if (input.penaltyId) {
        await this.penaltiesService.restorePendingPenalty(input.penaltyId);
      }

      throw error;
    }

    if (actor) {
      await this.auditService.recordEvent({
        actorUserId: actor.userId,
        branchId: actor.branchId,
        action: 'PAYMENT_REGISTER',
        entityType: 'payment',
        entityId: payment.id,
        metadata: {
          memberId: payment.memberId,
          amount: payment.amount,
          method: payment.method,
        },
      });
    }

    return payment;
  }

  async listPayments(query: ListPaymentsDto, user?: RequestUser) {
    const memberId = scopedMemberFilter(user, query.memberId);
    let items = await this.paymentsRepository.list({
      memberId,
      memberHomeBranchId: branchScopeId(user),
    });

    if (query.loanId) {
      items = items.filter((item) => item.loanId === query.loanId);
    }

    if (query.penaltyId) {
      items = items.filter((item) => item.penaltyId === query.penaltyId);
    }

    if (query.method) {
      items = items.filter((item) => item.method === query.method);
    }

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }

    if (user?.role === UserRole.SOCIO && user.memberId) {
      items = items.filter((item) => item.memberId === user.memberId);
    }

    return paginateFromQuery(items, query, 20);
  }
}
