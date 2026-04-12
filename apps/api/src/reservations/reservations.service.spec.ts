import { ConflictException } from '@nestjs/common';
import { MaterialType, MembershipLevel } from '../loans/loan-policies';
import { MaterialsRepository } from '../materials/materials.repository';
import { MaterialsService } from '../materials/materials.service';
import { CopyStatus } from '../materials/materials.types';
import { ReservationsRepository } from './reservations.repository';
import { ReservationsService } from './reservations.service';
import { ShipmentStatus } from './reservations.types';

describe('ReservationsService', () => {
  let service: ReservationsService;
  let materialsService: MaterialsService;
  let reservationsRepository: ReservationsRepository;

  beforeEach(() => {
    materialsService = new MaterialsService(new MaterialsRepository());
    reservationsRepository = new ReservationsRepository();
    service = new ReservationsService(reservationsRepository, materialsService);
  });

  it('creates local reservation ready for pickup with expiration window', async () => {
    const result = await service.createReservation({
      memberId: 'member_1',
      materialId: 'mat_00001',
      sourceBranchId: 'branch_centro',
      pickupBranchId: 'branch_centro',
      membershipLevel: MembershipLevel.BRONCE,
    });

    expect(result.shipment).toBeUndefined();
    expect(result.reservation.status).toBe('READY_FOR_PICKUP');
    expect(result.reservation.expiresAt).toBeDefined();
  });

  it('creates cross-branch reservation and shipment with level shipment fee', async () => {
    const result = await service.createReservation({
      memberId: 'member_2',
      materialId: 'mat_00001',
      sourceBranchId: 'branch_centro',
      pickupBranchId: 'branch_norte',
      membershipLevel: MembershipLevel.PLATA,
    });

    expect(result.shipment).toBeDefined();
    expect(result.shipment?.chargedFee).toBe(1.5);
    expect(result.shipment?.status).toBe('REQUESTED');
  });

  it('marks reservation cancelled when shipment is lost', async () => {
    const result = await service.createReservation({
      memberId: 'member_3',
      materialId: 'mat_00001',
      sourceBranchId: 'branch_centro',
      pickupBranchId: 'branch_norte',
      membershipLevel: MembershipLevel.BRONCE,
    });

    if (!result.shipment) {
      throw new ConflictException('Expected shipment to exist');
    }

    const update = await service.updateShipmentStatus(result.shipment.id, {
      status: ShipmentStatus.LOST,
    });

    expect(update.reservation?.status).toBe('CANCELLED');
  });

  it('moves copy from IN_TRANSFER to ON_LOAN when loan shipment arrives', async () => {
    const material = await materialsService.createMaterial({
      title: 'Demo Book',
      materialType: MaterialType.LIBRO,
      releaseDate: '2020-01-01',
      homeBranchId: 'branch_centro',
      basePrice: 2.5,
    });

    const copy = await materialsService.createCopy({
      materialId: material.id,
      branchId: 'branch_centro',
    });

    await materialsService.updateCopyStatus(copy.id, CopyStatus.IN_TRANSFER);

    const shipment = await reservationsRepository.createShipment({
      loanId: 'loan_demo_1',
      copyId: copy.id,
      fromBranchId: 'branch_centro',
      toBranchId: 'branch_norte',
      chargedFee: 2.99,
      requestedAt: new Date().toISOString(),
      slaTargetAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      slaDeadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    await service.updateShipmentStatus(shipment.id, {
      status: ShipmentStatus.ARRIVED,
    });

    const updatedCopy = await materialsService.getCopyOrThrow(copy.id);
    expect(updatedCopy.status).toBe(CopyStatus.ON_LOAN);
  });
});
