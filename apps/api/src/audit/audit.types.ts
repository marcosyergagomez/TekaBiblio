export type AuditRecord = {
  id: number;
  actorUserId: string;
  branchId?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};
