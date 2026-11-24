import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MaterialsRepository } from '../materials/materials.repository';
import { MaterialsService } from '../materials/materials.service';
import { PenaltiesRepository } from '../penalties/penalties.repository';
import { PenaltyType } from '../penalties/penalties.types';
import { ReservationsRepository } from '../reservations/reservations.repository';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanDomainPolicyService } from './loan-domain-policy.service';
import { LoansRepository } from './loans.repository';
import { LoansService } from './loans.service';
import { MaterialType, MembershipLevel } from './loan-policies';

describe('LoansService', () => {
  let service: LoansService;
  let materialsService: MaterialsService;
  let reservationsRepository: ReservationsRepository;

  beforeEach(() => {
    materialsService = new MaterialsService(new MaterialsRepository());
    reservationsRepository = new ReservationsRepository();
    service = new LoansService(
      new LoansRepository(),
      materialsService,
      reservationsRepository,
      new LoanDomainPolicyService(),
    );
  });

  function createLoanPayload(
    overrides: Partial<CreateLoanDto> = {},
  ): CreateLoanDto {
    return {
      memberId: 'member_1',
      copyId: 'copy_00001',
      pickupBranchId: 'branch_centro',
      membershipLevel: MembershipLevel.BRONCE,
      forceCrossBranchShipment: false,
      ...overrides,
    };
  }

  async function createCopyForType(
    materialType: MaterialType,
    branchId = 'branch_centro',
  ) {
    const material = await materialsService.createMaterial({
      title: `Material-${materialType}`,
      materialType,
      releaseDate: '2024-01-01',
      homeBranchId: branchId,
      basePrice: materialType === MaterialType.LIBRO ? 2.5 : 5,
    });

    return materialsService.createCopy({ materialId: material.id, branchId });
  }

  it('creates a loan applying level discount and shipment fee', async () => {
    const copy = await createCopyForType(MaterialType.LIBRO, 'branch_norte');

    const loan = await service.createLoan(
      createLoanPayload({
        copyId: copy.id,
        pickupBranchId: 'branch_centro',
        membershipLevel: MembershipLevel.ORO,
      }),
    );

    expect(loan.finalPrice).toBe(2.0);
    expect(loan.shipmentFee).toBe(0);
    expect(loan.status).toBe('ACTIVE');
  });

  it('blocks loan when debt threshold is reached', async () => {
    const penaltiesRepository = new PenaltiesRepository();
    const localService = new LoansService(
      new LoansRepository(),
      materialsService,
      reservationsRepository,
      new LoanDomainPolicyService(),
      penaltiesRepository,
    );
    await penaltiesRepository.create({
      memberId: 'member_1',
      penaltyType: PenaltyType.DAMAGE,
      amount: 20,
      reason: 'Outstanding debt',
    });

    await expect(localService.createLoan(createLoanPayload())).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('blocks loan when overdue days threshold is exceeded', async () => {
    const first = await createCopyForType(MaterialType.LIBRO);
    const startDate = new Date(
      Date.now() - 40 * 24 * 60 * 60 * 1000,
    ).toISOString();
    await service.createLoan(
      createLoanPayload({
        copyId: first.id,
        memberId: 'member_overdue',
        startDate,
      }),
    );
    const second = await createCopyForType(MaterialType.LIBRO);

    await expect(
      service.createLoan(
        createLoanPayload({
          copyId: second.id,
          memberId: 'member_overdue',
        }),
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rejects loan when active loans hit the level limit', async () => {
    const first = await createCopyForType(MaterialType.LIBRO);
    const second = await createCopyForType(MaterialType.LIBRO);
    await service.createLoan(
      createLoanPayload({
        copyId: first.id,
        memberId: 'member_limit',
      }),
    );
    await service.createLoan(
      createLoanPayload({
        copyId: second.id,
        memberId: 'member_limit',
      }),
    );
    const third = await createCopyForType(MaterialType.LIBRO);

    await expect(
      service.createLoan(
        createLoanPayload({
          copyId: third.id,
          memberId: 'member_limit',
          membershipLevel: MembershipLevel.BRONCE,
        }),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('renews a loan and extends due date', async () => {
    const copy = await createCopyForType(MaterialType.JUEGO_PC, 'branch_oeste');

    const created = await service.createLoan(
      createLoanPayload({
        copyId: copy.id,
        pickupBranchId: 'branch_oeste',
        membershipLevel: MembershipLevel.PLATA,
      }),
    );

    const previousDueDate = created.dueDate;
    const renewed = await service.renewLoan({
      loanId: created.id,
    });

    expect(renewed.renewalCount).toBe(1);
    expect(new Date(renewed.dueDate).getTime()).toBeGreaterThan(
      new Date(previousDueDate).getTime(),
    );
  });

  it('rejects renewal when there is third-party reservation', async () => {
    const copy = await createCopyForType(MaterialType.LIBRO, 'branch_centro');
    const created = await service.createLoan(
      createLoanPayload({
        copyId: copy.id,
        pickupBranchId: 'branch_centro',
      }),
    );
    const material = await materialsService.getCopyOrThrow(copy.id);
    await reservationsRepository.createReservation({
      memberId: 'member_other',
      materialId: material.materialId,
      sourceBranchId: 'branch_centro',
      pickupBranchId: 'branch_centro',
    });

    await expect(
      service.renewLoan({
        loanId: created.id,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('caps late fee according to material policy', async () => {
    const copy = await createCopyForType(MaterialType.PELICULA, 'branch_sur');
    const fortyDaysAgo = new Date(
      Date.now() - 40 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const created = await service.createLoan(
      createLoanPayload({
        copyId: copy.id,
        pickupBranchId: 'branch_sur',
        membershipLevel: MembershipLevel.BRONCE,
        startDate: fortyDaysAgo,
      }),
    );

    const returned = await service.returnLoan({
      loanId: created.id,
      returnedAt: new Date().toISOString(),
    });

    expect(returned.overdueDays).toBeGreaterThan(0);
    expect(returned.lateFee).toBe(12);
    expect(returned.status).toBe('RETURNED');
  });

  it('calculates a standalone late fee', () => {
    const result = service.calculateLateFee({
      materialType: MaterialType.LIBRO,
      overdueDays: 10,
    });

    expect(result.lateFee).toBe(5);
  });

  it('records a late penalty when the loan is returned late', async () => {
    const penaltiesRepository = new PenaltiesRepository();
    const localService = new LoansService(
      new LoansRepository(),
      materialsService,
      reservationsRepository,
      new LoanDomainPolicyService(),
      penaltiesRepository,
    );
    const copy = await createCopyForType(MaterialType.PELICULA, 'branch_sur');
    const created = await localService.createLoan(
      createLoanPayload({
        copyId: copy.id,
        pickupBranchId: 'branch_sur',
        startDate: new Date(
          Date.now() - 40 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      }),
    );

    await localService.returnLoan({
      loanId: created.id,
      returnedAt: new Date().toISOString(),
    });

    const penalties = await penaltiesRepository.list({ memberId: 'member_1' });
    expect(penalties).toHaveLength(1);
    expect(penalties[0]?.penaltyType).toBe(PenaltyType.LATE_RETURN);
    expect(penalties[0]?.amount).toBe(12);
  });
});
