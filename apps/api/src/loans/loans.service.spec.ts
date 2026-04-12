import {
  ConflictException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MaterialsRepository } from '../materials/materials.repository';
import { MaterialsService } from '../materials/materials.service';
import { ReservationsRepository } from '../reservations/reservations.repository';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoansRepository } from './loans.repository';
import { LoansService } from './loans.service';
import { MaterialType, MembershipLevel } from './loan-policies';

describe('LoansService', () => {
  let service: LoansService;
  let materialsService: MaterialsService;

  beforeEach(() => {
    materialsService = new MaterialsService(new MaterialsRepository());
    service = new LoansService(
      new LoansRepository(),
      materialsService,
      new ReservationsRepository(),
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
      activeLoansCount: 0,
      debtTotal: 0,
      maxOverdueDays: 0,
      overdueLoansLast60Days: 0,
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
    await expect(
      service.createLoan(
        createLoanPayload({
          debtTotal: 20,
        }),
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('blocks loan when overdue days threshold is exceeded', async () => {
    await expect(
      service.createLoan(
        createLoanPayload({
          maxOverdueDays: 11,
        }),
      ),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('rejects loan when active loans hit the level limit', async () => {
    await expect(
      service.createLoan(
        createLoanPayload({
          membershipLevel: MembershipLevel.BRONCE,
          activeLoansCount: 2,
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
      hasOutstandingDebt: false,
      hasThirdPartyReservation: false,
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

    await expect(
      service.renewLoan({
        loanId: created.id,
        hasOutstandingDebt: false,
        hasThirdPartyReservation: true,
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
});
