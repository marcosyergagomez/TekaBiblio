import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('API (e2e)', () => {
  let app: INestApplication<App>;
  const adminHeaders = {
    'x-user-id': 'u_admin_global',
    'x-user-role': 'admin_global',
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('supports materials filtering plus update/delete rules', async () => {
    const create = await request(app.getHttpServer())
      .post('/materials')
      .set(adminHeaders)
      .send({
        title: 'Material Demo E2E',
        materialType: 'LIBRO',
        releaseDate: '2024-01-01',
        homeBranchId: 'branch_centro',
        basePrice: 2.5,
      })
      .expect(201);

    const materialId = create.body.id;

    const filtered = await request(app.getHttpServer())
      .get('/materials')
      .query({ q: 'demo e2e' })
      .expect(200);

    expect(filtered.body.items.some((item: { id: string }) => item.id === materialId)).toBe(true);

    const patched = await request(app.getHttpServer())
      .patch(`/materials/${materialId}`)
      .set(adminHeaders)
      .send({ title: 'Material Demo E2E Updated' })
      .expect(200);

    expect(patched.body.title).toBe('Material Demo E2E Updated');

    await request(app.getHttpServer())
      .post('/copies')
      .set(adminHeaders)
      .send({
        materialId,
        branchId: 'branch_centro',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/materials/${materialId}`)
      .set(adminHeaders)
      .expect(409);

    const transient = await request(app.getHttpServer())
      .post('/materials')
      .set(adminHeaders)
      .send({
        title: 'To Delete E2E',
        materialType: 'PELICULA',
        releaseDate: '2024-01-01',
        homeBranchId: 'branch_centro',
        basePrice: 3.5,
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/materials/${transient.body.id}`)
      .set(adminHeaders)
      .expect(200);
  });

  it('creates cross-branch loan shipment and exposes dashboard reports', async () => {
    const material = await request(app.getHttpServer())
      .post('/materials')
      .set(adminHeaders)
      .send({
        title: 'Loan Flow E2E',
        materialType: 'JUEGO_PC',
        releaseDate: '2024-01-01',
        homeBranchId: 'branch_centro',
        basePrice: 4,
      })
      .expect(201);

    const copy = await request(app.getHttpServer())
      .post('/copies')
      .set(adminHeaders)
      .send({ materialId: material.body.id, branchId: 'branch_centro' })
      .expect(201);

    const loan = await request(app.getHttpServer())
      .post('/loans')
      .set(adminHeaders)
      .send({
        memberId: 'mbr_bronce_01',
        copyId: copy.body.id,
        pickupBranchId: 'branch_norte',
        membershipLevel: 'BRONCE',
        startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .expect(201);

    expect(loan.body.crossBranchShipment).toBe(true);

    const shipments = await request(app.getHttpServer())
      .get('/shipments')
      .set(adminHeaders)
      .expect(200);

    expect(shipments.body.total).toBeGreaterThan(0);
    expect(
      shipments.body.items.some((item: { loanId?: string }) => item.loanId === loan.body.id),
    ).toBe(true);

    const dashboard = await request(app.getHttpServer())
      .get('/reports/dashboard')
      .set(adminHeaders)
      .expect(200);

    expect(dashboard.body.income).toBeDefined();
    expect(dashboard.body.income.totals.loans).toBeGreaterThan(0);
    expect(dashboard.body.popularity).toBeDefined();

    const returned = await request(app.getHttpServer())
      .post('/loans/return')
      .set(adminHeaders)
      .send({ loanId: loan.body.id })
      .expect(201);

    expect(returned.body.status).toBe('RETURNED');
    expect(returned.body.lateFee).toBe(20);

    const penalties = await request(app.getHttpServer())
      .get('/penalties')
      .set(adminHeaders)
      .query({ memberId: 'mbr_bronce_01' })
      .expect(200);

    expect(
      penalties.body.items.some(
        (item: { loanId?: string; penaltyType?: string; amount?: number }) =>
          item.loanId === loan.body.id &&
          item.penaltyType === 'LATE_RETURN' &&
          item.amount === 20,
      ),
    ).toBe(true);
  });

  it('registers penalties and payments and exposes audit logs', async () => {
    const penalty = await request(app.getHttpServer())
      .post('/penalties')
      .set(adminHeaders)
      .send({
        memberId: 'mbr_plata_01',
        penaltyType: 'DAMAGE',
        amount: 9.5,
        reason: 'Broken cover',
      })
      .expect(201);

    expect(penalty.body.status).toBe('PENDING');

    const payment = await request(app.getHttpServer())
      .post('/payments')
      .set(adminHeaders)
      .send({
        memberId: 'mbr_plata_01',
        penaltyId: penalty.body.id,
        amount: 9.5,
        method: 'CARD',
      })
      .expect(201);

    expect(payment.body.status).toBe('PAID');

    const penalties = await request(app.getHttpServer())
      .get('/penalties')
      .set(adminHeaders)
      .query({ memberId: 'mbr_plata_01' })
      .expect(200);

    expect(penalties.body.items.some((item: { id: string; status: string }) => item.id === penalty.body.id && item.status === 'PAID')).toBe(true);

    const auditLogs = await request(app.getHttpServer())
      .get('/audit-logs')
      .set(adminHeaders)
      .expect(200);

    expect(
      auditLogs.body.items.some((item: { action: string }) => item.action === 'PENALTY_CREATE'),
    ).toBe(true);
    expect(
      auditLogs.body.items.some((item: { action: string }) => item.action === 'PAYMENT_REGISTER'),
    ).toBe(true);
  });
});
