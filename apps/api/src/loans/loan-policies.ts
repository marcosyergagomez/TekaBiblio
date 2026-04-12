export enum MaterialType {
  LIBRO = 'LIBRO',
  PELICULA = 'PELICULA',
  JUEGO_PC = 'JUEGO_PC',
  JUEGO_PLAYSTATION = 'JUEGO_PLAYSTATION',
  JUEGO_XBOX = 'JUEGO_XBOX',
}

export enum MembershipLevel {
  BRONCE = 'BRONCE',
  PLATA = 'PLATA',
  ORO = 'ORO',
}

export const LOAN_DAYS_BY_TYPE_LEVEL: Record<
  MaterialType,
  Record<MembershipLevel, number>
> = {
  [MaterialType.LIBRO]: {
    [MembershipLevel.BRONCE]: 14,
    [MembershipLevel.PLATA]: 21,
    [MembershipLevel.ORO]: 30,
  },
  [MaterialType.PELICULA]: {
    [MembershipLevel.BRONCE]: 3,
    [MembershipLevel.PLATA]: 5,
    [MembershipLevel.ORO]: 7,
  },
  [MaterialType.JUEGO_PC]: {
    [MembershipLevel.BRONCE]: 5,
    [MembershipLevel.PLATA]: 7,
    [MembershipLevel.ORO]: 10,
  },
  [MaterialType.JUEGO_PLAYSTATION]: {
    [MembershipLevel.BRONCE]: 5,
    [MembershipLevel.PLATA]: 7,
    [MembershipLevel.ORO]: 10,
  },
  [MaterialType.JUEGO_XBOX]: {
    [MembershipLevel.BRONCE]: 5,
    [MembershipLevel.PLATA]: 7,
    [MembershipLevel.ORO]: 10,
  },
};

export const BASE_PRICE_BY_TYPE: Record<MaterialType, number> = {
  [MaterialType.LIBRO]: 2.5,
  [MaterialType.PELICULA]: 3.5,
  [MaterialType.JUEGO_PC]: 4.0,
  [MaterialType.JUEGO_PLAYSTATION]: 5.0,
  [MaterialType.JUEGO_XBOX]: 5.0,
};

export const LEVEL_PRICE_ADJUSTMENT: Record<MembershipLevel, number> = {
  [MembershipLevel.BRONCE]: 0,
  [MembershipLevel.PLATA]: -0.1,
  [MembershipLevel.ORO]: -0.2,
};

export const LOAN_LIMIT_BY_LEVEL: Record<MembershipLevel, number> = {
  [MembershipLevel.BRONCE]: 2,
  [MembershipLevel.PLATA]: 4,
  [MembershipLevel.ORO]: 6,
};

export const RENEWAL_LIMIT_BY_LEVEL: Record<MembershipLevel, number> = {
  [MembershipLevel.BRONCE]: 1,
  [MembershipLevel.PLATA]: 2,
  [MembershipLevel.ORO]: 3,
};

export const LATE_FEE_DAILY_BY_TYPE: Record<MaterialType, number> = {
  [MaterialType.LIBRO]: 0.5,
  [MaterialType.PELICULA]: 1.0,
  [MaterialType.JUEGO_PC]: 1.5,
  [MaterialType.JUEGO_PLAYSTATION]: 1.5,
  [MaterialType.JUEGO_XBOX]: 1.5,
};

export const LATE_FEE_CAP_BY_TYPE: Record<MaterialType, number> = {
  [MaterialType.LIBRO]: 15.0,
  [MaterialType.PELICULA]: 12.0,
  [MaterialType.JUEGO_PC]: 20.0,
  [MaterialType.JUEGO_PLAYSTATION]: 20.0,
  [MaterialType.JUEGO_XBOX]: 20.0,
};

export const SHIPMENT_FEE_BY_LEVEL: Record<MembershipLevel, number> = {
  [MembershipLevel.BRONCE]: 2.99,
  [MembershipLevel.PLATA]: 1.5,
  [MembershipLevel.ORO]: 0.0,
};

export const BLOCK_RULES = {
  DEBT_THRESHOLD: 20,
  OVERDUE_DAYS_THRESHOLD: 10,
  OVERDUE_LOANS_60_DAYS_THRESHOLD: 3,
} as const;

export type BlockEvaluationInput = {
  debtTotal: number;
  maxOverdueDays: number;
  overdueLoansLast60Days: number;
};

export function roundMoney(value: number): number {
  return Number(value.toFixed(2));
}

export function getLoanDays(
  materialType: MaterialType,
  membershipLevel: MembershipLevel,
): number {
  return LOAN_DAYS_BY_TYPE_LEVEL[materialType][membershipLevel];
}

export function getFinalPrice(
  materialType: MaterialType,
  membershipLevel: MembershipLevel,
): number {
  const basePrice = BASE_PRICE_BY_TYPE[materialType];
  const adjustment = LEVEL_PRICE_ADJUSTMENT[membershipLevel];
  return roundMoney(basePrice * (1 + adjustment));
}

export function getShipmentFee(
  membershipLevel: MembershipLevel,
  crossBranchShipment: boolean,
): number {
  if (!crossBranchShipment) {
    return 0;
  }

  return SHIPMENT_FEE_BY_LEVEL[membershipLevel];
}

export function getLateFee(
  materialType: MaterialType,
  overdueDays: number,
): number {
  if (overdueDays <= 0) {
    return 0;
  }

  const dailyFee = LATE_FEE_DAILY_BY_TYPE[materialType];
  const feeCap = LATE_FEE_CAP_BY_TYPE[materialType];
  return roundMoney(Math.min(overdueDays * dailyFee, feeCap));
}

export function evaluateBlockReasons(input: BlockEvaluationInput): string[] {
  const reasons: string[] = [];

  if (input.debtTotal >= BLOCK_RULES.DEBT_THRESHOLD) {
    reasons.push(
      `Debt threshold reached: ${input.debtTotal} >= ${BLOCK_RULES.DEBT_THRESHOLD}`,
    );
  }

  if (input.maxOverdueDays > BLOCK_RULES.OVERDUE_DAYS_THRESHOLD) {
    reasons.push(
      `Overdue days threshold reached: ${input.maxOverdueDays} > ${BLOCK_RULES.OVERDUE_DAYS_THRESHOLD}`,
    );
  }

  if (
    input.overdueLoansLast60Days >= BLOCK_RULES.OVERDUE_LOANS_60_DAYS_THRESHOLD
  ) {
    reasons.push(
      `Overdue loans threshold reached: ${input.overdueLoansLast60Days} >= ${BLOCK_RULES.OVERDUE_LOANS_60_DAYS_THRESHOLD}`,
    );
  }

  return reasons;
}
