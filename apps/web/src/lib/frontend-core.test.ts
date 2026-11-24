import axios from 'axios';
import { beforeEach, describe, expect, it } from 'vitest';
import { getSession, setSession } from '../auth/session-store';
import { countCopies } from '../features/catalog/copy-counts';
import {
  buildCheckoutPayload,
  buildLoanRisk,
  CHECKOUT_FIELDS,
  describeResult,
  readDashboard,
} from '../features/staff/loan-risk';
import { isAbortError, readApiError } from './api-error';
import { formatDate, formatMoney, parseAmount, sumMoney } from './format';
import { fetchAllItems } from './paging';
import { shouldAttemptRefresh } from './refresh-policy';

describe('refresh policy', () => {
  it('does not refresh a failed login', () => {
    expect(shouldAttemptRefresh('/auth/login', 401, false)).toBe(false);
    expect(shouldAttemptRefresh('http://localhost:3000/auth/refresh', 401, false)).toBe(false);
    expect(shouldAttemptRefresh('/auth/logout', 401, false)).toBe(false);
    expect(shouldAttemptRefresh('/auth/logout-all', 401, false)).toBe(true);
  });

  it('refreshes a protected request once', () => {
    expect(shouldAttemptRefresh('/loans', 401, false)).toBe(true);
    expect(shouldAttemptRefresh('/loans', 401, true)).toBe(false);
    expect(shouldAttemptRefresh('/loans', 500, false)).toBe(false);
  });
});

describe('money and dates', () => {
  it('formats finite amounts and rejects the rest', () => {
    expect(formatMoney('2.5')).toBe('2.50');
    expect(formatMoney('nope')).toBeNull();
    expect(sumMoney([1.1, '2.2', undefined])).toBe(3.3);
    expect(parseAmount(' 4.239 ')).toBe(4.24);
    expect(parseAmount('-1')).toBeNull();
  });

  it('does not render an invalid date', () => {
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate('not-a-date')).toBeNull();
    expect(formatDate('2026-01-02T00:00:00.000Z')).toBeTruthy();
  });
});

describe('api errors', () => {
  it('reads nest validation messages', () => {
    const error = new axios.AxiosError('Request failed');
    error.response = {
      data: { message: ['email must be an email', 'password should not be empty'] },
      status: 400,
      statusText: 'Bad Request',
      headers: {},
      config: { headers: new axios.AxiosHeaders() },
    };

    expect(readApiError(error)).toBe('email must be an email, password should not be empty');
    expect(readApiError(new Error('local'))).toBeNull();
    expect(isAbortError(new DOMException('aborted', 'AbortError'))).toBe(true);
  });
});

describe('catalog copies', () => {
  it('counts available copies separately from the total', () => {
    expect(
      countCopies(
        [
          { materialId: 'mat_1', status: 'AVAILABLE' },
          { materialId: 'mat_1', status: 'ON_LOAN' },
          { materialId: 'mat_2', status: 'AVAILABLE' },
        ],
        'mat_1',
      ),
    ).toEqual({ total: 2, available: 1 });
  });
});

describe('loan risk', () => {
  const now = new Date('2026-06-15T00:00:00.000Z');

  it('uses pending penalties and recent overdue loans', () => {
    const risk = buildLoanRisk(
      [
        { status: 'ACTIVE', dueDate: '2026-06-13T00:00:00.000Z' },
        { status: 'ACTIVE', dueDate: '2026-07-01T00:00:00.000Z' },
        {
          status: 'RETURNED',
          dueDate: '2026-06-08T00:00:00.000Z',
          returnedAt: '2026-06-10T00:00:00.000Z',
        },
        {
          status: 'RETURNED',
          dueDate: '2025-12-01T00:00:00.000Z',
          returnedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      [
        { status: 'PENDING', amount: 10.5 },
        { status: 'PENDING', amount: 0.25 },
        { status: 'PAID', amount: 99 },
      ],
      now,
    );

    expect(risk).toEqual({
      activeLoansCount: 2,
      debtTotal: 10.75,
      maxOverdueDays: 2,
      overdueLoansLast60Days: 2,
    });
  });
});

describe('checkout contract', () => {
  it('sends only the fields the loan API still accepts from the desk', () => {
    const payload = buildCheckoutPayload({
      memberId: 'mbr_oro_01',
      copyId: 'copy_lib_001',
      pickupBranchId: 'branch_oeste',
      membershipLevel: 'ORO',
    });

    expect(Object.keys(payload).sort()).toEqual([...CHECKOUT_FIELDS].sort());
    expect(payload).not.toHaveProperty('debtTotal');
    expect(payload).not.toHaveProperty('activeLoansCount');
  });
});

describe('staff results', () => {
  it('describes a created record without dumping the payload', () => {
    expect(describeResult({ id: 'mat_1', title: 'Dune' })).toBe('Dune (mat_1)');
    expect(describeResult(null)).toBeNull();
  });

  it('rejects a dashboard that cannot be rendered', () => {
    expect(readDashboard({ income: { totals: { loans: 1 } } })).toBeNull();
    expect(
      readDashboard({
        generatedAt: '2026-01-01T00:00:00.000Z',
        income: { totals: { loans: 12, totalRevenue: 42.5 } },
        losses: { totals: { lostCopies: 1, estimatedLossAmount: 9.99 } },
      })?.income.totals.loans,
    ).toBe(12);
  });
});

describe('paging', () => {
  it('stops when the reported total is reached', async () => {
    const pages = [
      { items: [1, 2], total: 3, page: 1, pageSize: 2 },
      { items: [3], total: 3, page: 2, pageSize: 2 },
    ];
    const items = await fetchAllItems(async (page) => pages[page - 1]);
    expect(items).toEqual([1, 2, 3]);
  });
});

describe('session store', () => {
  beforeEach(() => {
    setSession(null);
  });

  it('keeps the current session until it is cleared', () => {
    setSession({
      accessToken: 'access',
      refreshToken: 'refresh',
      user: { userId: 'u_1', role: 'socio' },
    });
    expect(getSession()?.user.userId).toBe('u_1');
    setSession(null);
    expect(getSession()).toBeNull();
  });
});
