import { ConflictException, Injectable } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { PenaltiesService } from '../penalties/penalties.service';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { PaymentsRepository } from './payments.repository';
import { PaymentMethod } from './payments.types';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentsRepository: PaymentsRepository,
    private readonly penaltiesService: PenaltiesService,
    private readonly auditService: AuditService,
  ) {}

  async registerPayment(input: RegisterPaymentDto, actor?: RequestUser) {
    if (!input.loanId && !input.penaltyId) {
      throw new ConflictException('Payment must reference loanId or penaltyId');
    }

    if (input.penaltyId) {
      const penalty = await this.penaltiesService.markPenaltyPaid(
        input.penaltyId,
        actor,
      );
      if (penalty.memberId !== input.memberId) {
        throw new ConflictException(
          'Penalty member does not match payment member',
        );
      }
    }

    const payment = await this.paymentsRepository.create({
      memberId: input.memberId,
      loanId: input.loanId,
      penaltyId: input.penaltyId,
      amount: input.amount,
      method: input.method ?? PaymentMethod.SIMULATED,
    });

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
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    let items = await this.paymentsRepository.list();

    if (query.memberId) {
      items = items.filter((item) => item.memberId === query.memberId);
    }

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

    const total = items.length;
    const start = (page - 1) * pageSize;

    return {
      items: items.slice(start, start + pageSize),
      total,
      page,
      pageSize,
    };
  }
}
