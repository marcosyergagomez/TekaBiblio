export enum PenaltyType {
  LATE_RETURN = 'LATE_RETURN',
  RESERVATION_EXPIRE = 'RESERVATION_EXPIRE',
  LOST_COPY = 'LOST_COPY',
  DAMAGE = 'DAMAGE',
}

export enum PenaltyStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  WAIVED = 'WAIVED',
}

export type PenaltyRecord = {
  id: string;
  memberId: string;
  loanId?: string;
  reservationId?: string;
  penaltyType: PenaltyType;
  amount: number;
  status: PenaltyStatus;
  reason: string;
  createdAt: string;
};
