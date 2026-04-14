import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { SqlStoreService } from '../src/database/sql-store.service';

type EnvSnapshot = {
  NODE_ENV?: string;
  DB_DISABLE?: string;
  JWT_SECRET?: string;
  ALLOW_INSECURE_HEADER_AUTH?: string;
  ALLOW_DEMO_PASSWORD_AUTH?: string;
  DEMO_AUTH_PASSWORD?: string;
};

function snapshotEnv(): EnvSnapshot {
  return {
    NODE_ENV: process.env.NODE_ENV,
    DB_DISABLE: process.env.DB_DISABLE,
    JWT_SECRET: process.env.JWT_SECRET,
    ALLOW_INSECURE_HEADER_AUTH: process.env.ALLOW_INSECURE_HEADER_AUTH,
    ALLOW_DEMO_PASSWORD_AUTH: process.env.ALLOW_DEMO_PASSWORD_AUTH,
    DEMO_AUTH_PASSWORD: process.env.DEMO_AUTH_PASSWORD,
  };
}

function restoreEnv(snapshot: EnvSnapshot): void {
  process.env.NODE_ENV = snapshot.NODE_ENV;
  process.env.DB_DISABLE = snapshot.DB_DISABLE;
  process.env.JWT_SECRET = snapshot.JWT_SECRET;
  process.env.ALLOW_INSECURE_HEADER_AUTH = snapshot.ALLOW_INSECURE_HEADER_AUTH;
  process.env.ALLOW_DEMO_PASSWORD_AUTH = snapshot.ALLOW_DEMO_PASSWORD_AUTH;
  process.env.DEMO_AUTH_PASSWORD = snapshot.DEMO_AUTH_PASSWORD;
}

describe('Auth and permissions contract (e2e)', () => {
  let app: INestApplication<App>;

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  it('requires bearer token when insecure header auth is disabled', async () => {
    const env = snapshotEnv();
    process.env.NODE_ENV = 'development';
    process.env.DB_DISABLE = '1';
    process.env.JWT_SECRET = 'dev-contract-secret-at-least-32-chars';
    process.env.ALLOW_INSECURE_HEADER_AUTH = '0';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('x-user-id', 'u_admin_global')
      .set('x-user-role', 'admin_global')
      .expect(401);

    restoreEnv(env);
  });

  it('issues a bearer token on login and allows access to /auth/me', async () => {
    const env = snapshotEnv();
    process.env.NODE_ENV = 'development';
    process.env.DB_DISABLE = '1';
    process.env.JWT_SECRET = 'dev-contract-secret-at-least-32-chars';
    process.env.ALLOW_DEMO_PASSWORD_AUTH = '1';
    process.env.DEMO_AUTH_PASSWORD = 'Demo12345!';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'admin.global@tekabiblio.local',
        password: 'Demo12345!',
      })
      .expect(201);

    const accessToken = loginResponse.body.accessToken as string;
    expect(accessToken).toBeDefined();

    const meResponse = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(meResponse.body.user.role).toBe('admin_global');

    restoreEnv(env);
  });

  it('forbids socio role from accessing audit logs', async () => {
    const env = snapshotEnv();
    process.env.NODE_ENV = 'test';
    process.env.DB_DISABLE = '1';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .get('/audit-logs')
      .set('x-user-id', 'u_member_oro')
      .set('x-user-role', 'socio')
      .set('x-member-id', 'mbr_oro_01')
      .expect(403);

    restoreEnv(env);
  });

  it('enforces branch scope for admin_sede operations', async () => {
    const env = snapshotEnv();
    process.env.NODE_ENV = 'test';
    process.env.DB_DISABLE = '0';

    const sqlStoreMock = {
      isEnabled: () => true,
      query: async () => [],
      execute: async () => undefined,
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SqlStoreService)
      .useValue(sqlStoreMock)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await request(app.getHttpServer())
      .post('/materials')
      .set('x-user-id', 'u_admin_norte')
      .set('x-user-role', 'admin_sede')
      .set('x-branch-id', 'branch_norte')
      .send({
        title: 'Out of scope material',
        materialType: 'LIBRO',
        releaseDate: '2024-01-01',
        homeBranchId: 'branch_sur',
        basePrice: 3,
      })
      .expect(403);

    restoreEnv(env);
  });
});
