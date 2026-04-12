export enum PaymentMethod {
  CASH = 'CASH',
  CARD = 'CARD',
  SIMULATED = 'SIMULATED',
}

export enum PaymentStatus {
  PAID = 'PAID',
  REFUNDED = 'REFUNDED',
}

export type PaymentRecord = {
  id: string;
  memberId: string;
  loanId?: string;
  penaltyId?: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  paidAt: string;
};
