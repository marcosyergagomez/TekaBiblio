const DAY_MS = 86_400_000;

export type LoanRiskInput = {
  status: string;
  dueDate: string;
  returnedAt?: string | null;
};

export type PenaltyRiskInput = {
  status: string;
  amount: number;
};

export type LoanRisk = {
  activeLoansCount: number;
  debtTotal: number;
  maxOverdueDays: number;
  overdueLoansLast60Days: number;
};

export function buildLoanRisk(
  loans: readonly LoanRiskInput[],
  penalties: readonly PenaltyRiskInput[],
  now = new Date(),
): LoanRisk {
  const nowMs = now.getTime();
  const windowStart = nowMs - 60 * DAY_MS;
  let activeLoansCount = 0;
  let maxOverdueDays = 0;
  let overdueLoansLast60Days = 0;

  for (const loan of loans) {
    if (loan.status === 'ACTIVE') {
      activeLoansCount += 1;
    }

    const due = Date.parse(loan.dueDate);
    if (!Number.isFinite(due)) {
      continue;
    }

    const end = loan.status === 'RETURNED' ? Date.parse(loan.returnedAt ?? '') : nowMs;
    if (!Number.isFinite(end) || end <= due) {
      continue;
    }

    const overdueDays = Math.floor((end - due) / DAY_MS);
    if (overdueDays <= 0 || end < windowStart) {
      continue;
    }

    overdueLoansLast60Days += 1;
    if (overdueDays > maxOverdueDays) {
      maxOverdueDays = overdueDays;
    }
  }

  const debtTotal = penalties.reduce((sum, penalty) => {
    if (penalty.status !== 'PENDING') {
      return sum;
    }

    const amount = Number(penalty.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  return {
    activeLoansCount,
    debtTotal: Number(debtTotal.toFixed(2)),
    maxOverdueDays,
    overdueLoansLast60Days,
  };
}

export type DashboardSnapshot = {
  generatedAt: string;
  income: { totals: { loans: number; totalRevenue: number } };
  losses: { totals: { lostCopies: number; estimatedLossAmount: number } };
};

function readNumber(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(amount) ? amount : null;
}

export function readDashboard(value: unknown): DashboardSnapshot | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const data = value as Record<string, unknown>;
  const income = data.income as Record<string, unknown> | undefined;
  const losses = data.losses as Record<string, unknown> | undefined;
  const incomeTotals = income?.totals as Record<string, unknown> | undefined;
  const lossTotals = losses?.totals as Record<string, unknown> | undefined;
  const loans = readNumber(incomeTotals?.loans);
  const totalRevenue = readNumber(incomeTotals?.totalRevenue);
  const lostCopies = readNumber(lossTotals?.lostCopies);
  const estimatedLossAmount = readNumber(lossTotals?.estimatedLossAmount);

  if (
    loans === null ||
    totalRevenue === null ||
    lostCopies === null ||
    estimatedLossAmount === null
  ) {
    return null;
  }

  return {
    generatedAt: typeof data.generatedAt === 'string' ? data.generatedAt : '',
    income: { totals: { loans, totalRevenue } },
    losses: { totals: { lostCopies, estimatedLossAmount } },
  };
}

export function describeResult(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : null;
  const title = typeof record.title === 'string' ? record.title : null;
  if (title && id) {
    return `${title} (${id})`;
  }

  return id ?? title;
}

export const CHECKOUT_FIELDS = [
  'memberId',
  'copyId',
  'pickupBranchId',
  'membershipLevel',
] as const;

export function buildCheckoutPayload(input: {
  memberId: string;
  copyId: string;
  pickupBranchId: string;
  membershipLevel: string;
}): Record<(typeof CHECKOUT_FIELDS)[number], string> {
  return {
    memberId: input.memberId,
    copyId: input.copyId,
    pickupBranchId: input.pickupBranchId,
    membershipLevel: input.membershipLevel,
  };
}
