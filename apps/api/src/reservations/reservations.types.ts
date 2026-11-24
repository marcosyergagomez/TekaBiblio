import { MembershipLevel } from '../loans/loan-policies';

export enum ReservationStatus {
  QUEUED = 'QUEUED',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  FULFILLED = 'FULFILLED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ShipmentStatus {
  REQUESTED = 'REQUESTED',
  PREPARING = 'PREPARING',
  IN_TRANSIT = 'IN_TRANSIT',
  ARRIVED = 'ARRIVED',
  READY_FOR_PICKUP = 'READY_FOR_PICKUP',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  LOST = 'LOST',
}

export type ReservationRecord = {
  id: string;
  memberId: string;
  materialId: string;
  sourceBranchId: string;
  pickupBranchId: string;
  status: ReservationStatus;
  queuePosition: number;
  readyForPickupAt?: string;
  expiresAt?: string;
  expireFee: number;
};

export type ShipmentRecord = {
  id: string;
  reservationId?: string;
  loanId?: string;
  memberId?: string;
  copyId: string;
  fromBranchId: string;
  toBranchId: string;
  status: ShipmentStatus;
  baseFee: number;
  chargedFee: number;
  requestedAt: string;
  deliveredAt?: string;
  slaTargetAt: string;
  slaDeadlineAt: string;
};

export type CreateReservationInput = {
  memberId: string;
  materialId: string;
  sourceBranchId: string;
  pickupBranchId: string;
};

export type CreateShipmentInput = {
  reservationId?: string;
  loanId?: string;
  memberId?: string;
  copyId: string;
  fromBranchId: string;
  toBranchId: string;
  chargedFee: number;
  requestedAt: string;
  slaTargetAt: string;
  slaDeadlineAt: string;
};

export type ReservationContext = {
  membershipLevel: MembershipLevel;
};
