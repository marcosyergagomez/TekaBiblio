import { expect, test } from '@playwright/test';

type DemoUser = {
  userId: string;
  role: string;
  branchId?: string;
  memberId?: string;
};

async function mockLogin(page: import('@playwright/test').Page, user: DemoUser) {
  await page.route('**/auth/login', async (route) => {
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        accessToken: 'access-token-demo',
        refreshToken: 'refresh-token-demo',
        user,
      }),
    });
  });

  await page.route('**/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user }),
    });
  });

  await page.goto('/login');
  await page.getByLabel('Email').fill('demo@tekabiblio.local');
  await page.getByLabel('Password').fill('Demo12345!');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page).toHaveURL(/\/profile$/);
}

test('login flow redirects to profile and loads user context', async ({ page }) => {
  await mockLogin(page, {
    userId: 'u_member_oro',
    role: 'socio',
    memberId: 'mbr_oro_01',
    branchId: 'branch_oeste',
  });

  await expect(page.getByRole('heading', { name: 'Perfil actual' })).toBeVisible();
  await expect(page.getByText('u_member_oro')).toBeVisible();
});

test('catalog flow shows mocked materials after search', async ({ page }) => {
  await page.route('**/materials**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'mat_1',
            title: 'Dune',
            materialType: 'LIBRO',
            homeBranchId: 'branch_centro',
            basePrice: 2.5,
          },
        ],
        total: 1,
        page: 1,
        pageSize: 100,
      }),
    });
  });

  await page.route('**/copies**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [
          {
            id: 'copy_1',
            materialId: 'mat_1',
            branchId: 'branch_centro',
            status: 'AVAILABLE',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 200,
      }),
    });
  });

  await mockLogin(page, {
    userId: 'u_member_oro',
    role: 'socio',
    memberId: 'mbr_oro_01',
    branchId: 'branch_oeste',
  });

  await page.getByRole('link', { name: 'Catalogo' }).click();
  await expect(page.getByRole('heading', { name: 'Catalogo' })).toBeVisible();

  await page.getByPlaceholder('Buscar por titulo').fill('Dune');
  await page.getByRole('button', { name: 'Buscar' }).click();

  await expect(page.getByRole('cell', { name: 'Dune' })).toBeVisible();
});

test('staff flow creates material and loads dashboard', async ({ page }) => {
  await page.route('**/materials', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'mat_new',
          title: 'Demo Material',
          materialType: 'LIBRO',
          homeBranchId: 'branch_centro',
          basePrice: 2.5,
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 100 }),
    });
  });

  await page.route('**/reports/dashboard**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        generatedAt: '2026-01-01T00:00:00.000Z',
        income: { totals: { loans: 12, totalRevenue: 42.5 } },
        losses: { totals: { lostCopies: 1, estimatedLossAmount: 9.99 } },
      }),
    });
  });

  await mockLogin(page, {
    userId: 'u_admin_global',
    role: 'admin_global',
    branchId: 'branch_centro',
  });

  await page.getByRole('link', { name: 'Operativa staff' }).click();
  await expect(page.getByRole('heading', { name: 'Panel Staff' })).toBeVisible();

  await page.getByRole('button', { name: 'Crear material' }).click();
  await expect(page.getByText('Crear material OK')).toBeVisible();

  await page.getByRole('button', { name: 'Cargar dashboard' }).click();
  await expect(page.getByText('Cargar dashboard OK')).toBeVisible();
});
