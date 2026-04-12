import { MaterialType } from '../loans/loan-policies';

export enum CopyStatus {
  AVAILABLE = 'AVAILABLE',
  ON_LOAN = 'ON_LOAN',
  IN_TRANSFER = 'IN_TRANSFER',
  LOST = 'LOST',
  DAMAGED = 'DAMAGED',
}

export type MaterialRecord = {
  id: string;
  title: string;
  materialType: MaterialType;
  releaseDate: string;
  homeBranchId: string;
  basePrice: number;
};

export type CopyRecord = {
  id: string;
  materialId: string;
  branchId: string;
  status: CopyStatus;
};
