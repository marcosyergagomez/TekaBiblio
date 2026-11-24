import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { branchScopeId, scopedMemberFilter } from '../common/access-scope';
import { paginateFromQuery } from '../common/pagination';
import { LoansService } from '../loans/loans.service';
import { CreateLoanPenaltyDto } from './dto/create-loan-penalty.dto';
import { CreatePenaltyDto } from './dto/create-penalty.dto';
import { ListPenaltiesDto } from './dto/list-penalties.dto';
import { WaivePenaltyDto } from './dto/waive-penalty.dto';
import { PenaltiesRepository } from './penalties.repository';
import { PenaltyRecord, PenaltyStatus, PenaltyType } from './penalties.types';

@Injectable()
export class PenaltiesService {
  constructor(
    private readonly penaltiesRepository: PenaltiesRepository,
    @Inject(forwardRef(() => LoansService))
    private readonly loansService: LoansService,
    private readonly auditService: AuditService,
  ) {}

  async createPenalty(
    input: CreatePenaltyDto,
    actor?: RequestUser,
  ): Promise<PenaltyRecord> {
    const penalty = await this.penaltiesRepository.create(input);

    if (actor) {
      await this.auditService.recordEvent({
        actorUserId: actor.userId,
        branchId: actor.branchId,
        action: 'PENALTY_CREATE',
        entityType: 'penalty',
        entityId: penalty.id,
        metadata: {
          memberId: penalty.memberId,
          amount: penalty.amount,
          penaltyType: penalty.penaltyType,
        },
      });
    }

    return penalty;
  }

  async createPenaltyFromLoan(
    input: CreateLoanPenaltyDto,
    actor?: RequestUser,
  ): Promise<PenaltyRecord> {
    const loan = await this.loansService.findOne(input.loanId);

    if (!loan) {
      throw new NotFoundException(`Loan ${input.loanId} not found`);
    }

    if (loan.status !== 'RETURNED') {
      throw new ConflictException(
        'Loan must be returned before generating a late penalty',
      );
    }

    if (!loan.lateFee || loan.lateFee <= 0) {
      throw new ConflictException('Loan does not have late fee to penalize');
    }

    const alreadyExists = await this.penaltiesRepository.hasOpenLatePenalty(
      loan.id,
    );

    if (alreadyExists) {
      throw new ConflictException(
        `Late penalty already exists for loan ${loan.id}`,
      );
    }

    return this.createPenalty(
      {
        memberId: loan.memberId,
        loanId: loan.id,
        penaltyType: PenaltyType.LATE_RETURN,
        amount: loan.lateFee,
        reason: `Late return generated from loan ${loan.id}`,
      },
      actor,
    );
  }

  async listPenalties(query: ListPenaltiesDto, user?: RequestUser) {
    const memberId = scopedMemberFilter(user, query.memberId);
    let items = await this.penaltiesRepository.list({
      memberId,
      memberHomeBranchId: branchScopeId(user),
    });

    if (query.loanId) {
      items = items.filter((item) => item.loanId === query.loanId);
    }

    if (query.penaltyType) {
      items = items.filter((item) => item.penaltyType === query.penaltyType);
    }

    if (query.status) {
      items = items.filter((item) => item.status === query.status);
    }

    if (user?.role === UserRole.SOCIO && user.memberId) {
      items = items.filter((item) => item.memberId === user.memberId);
    }

    return paginateFromQuery(items, query, 20);
  }

  async waivePenalty(
    penaltyId: string,
    payload: WaivePenaltyDto,
    actor?: RequestUser,
  ): Promise<PenaltyRecord> {
    const penalty = await this.penaltiesRepository.getByIdOrThrow(penaltyId);

    if (penalty.status !== PenaltyStatus.PENDING) {
      throw new ConflictException(
        `Only PENDING penalties can be waived. Current: ${penalty.status}`,
      );
    }

    penalty.status = PenaltyStatus.WAIVED;
    penalty.reason = payload.reason ?? `Waived by staff`;
    await this.penaltiesRepository.save(penalty);

    if (actor) {
      await this.auditService.recordEvent({
        actorUserId: actor.userId,
        branchId: actor.branchId,
        action: 'PENALTY_WAIVE',
        entityType: 'penalty',
        entityId: penalty.id,
        metadata: {
          reason: penalty.reason,
        },
      });
    }

    return penalty;
  }

  async getPenaltyOrThrow(penaltyId: string): Promise<PenaltyRecord> {
    return this.penaltiesRepository.getByIdOrThrow(penaltyId);
  }

  async markPendingPenaltyPaid(
    penaltyId: string,
    actor?: RequestUser,
  ): Promise<PenaltyRecord | undefined> {
    const penalty = await this.penaltiesRepository.markPaidIfPending(penaltyId);
    if (!penalty || !actor) {
      return penalty;
    }

    await this.auditService.recordEvent({
      actorUserId: actor.userId,
      branchId: actor.branchId,
      action: 'PENALTY_MARK_PAID',
      entityType: 'penalty',
      entityId: penalty.id,
    });
    return penalty;
  }

  async restorePendingPenalty(penaltyId: string): Promise<void> {
    const penalty = await this.penaltiesRepository.getByIdOrThrow(penaltyId);
    penalty.status = PenaltyStatus.PENDING;
    await this.penaltiesRepository.save(penalty);
  }

  async markPenaltyPaid(
    penaltyId: string,
    actor?: RequestUser,
  ): Promise<PenaltyRecord> {
    const penalty = await this.penaltiesRepository.getByIdOrThrow(penaltyId);

    if (penalty.status !== PenaltyStatus.PENDING) {
      throw new ConflictException(
        `Only PENDING penalties can be paid. Current: ${penalty.status}`,
      );
    }

    penalty.status = PenaltyStatus.PAID;
    await this.penaltiesRepository.save(penalty);

    if (actor) {
      await this.auditService.recordEvent({
        actorUserId: actor.userId,
        branchId: actor.branchId,
        action: 'PENALTY_MARK_PAID',
        entityType: 'penalty',
        entityId: penalty.id,
      });
    }

    return penalty;
  }
}
