export type SessionUser = {
  userId: string;
  role: string;
  branchId?: string;
  memberId?: string;
};

export type SessionState = {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
};

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type Material = {
  id: string;
  title: string;
  materialType: string;
  homeBranchId: string;
  basePrice: number;
  totalCopies?: number;
  availableCopies?: number;
};

export type Shipment = {
  id: string;
  copyId: string;
  fromBranchId: string;
  toBranchId: string;
  status: string;
};

export type Copy = {
  id: string;
  materialId: string;
  branchId: string;
  status: string;
};

export type Loan = {
  id: string;
  memberId: string;
  materialType: string;
  status: string;
  dueDate: string;
  returnedAt?: string;
  finalPrice: number;
  shipmentFee: number;
  lateFee?: number;
};

export type Reservation = {
  id: string;
  materialId: string;
  pickupBranchId: string;
  status: string;
  queuePosition: number;
  expiresAt?: string;
};

export type Penalty = {
  id: string;
  amount: number;
  status: string;
};

export type Profile = {
  user: SessionUser;
};
