import { Injectable, Optional } from '@nestjs/common';
import { RowDataPacket } from 'mysql2/promise';
import { SqlStoreService } from '../database/sql-store.service';
import { AuditRecord } from './audit.types';

type AuditRow = RowDataPacket & {
  id: number;
  actorUserId: string;
  branchId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string | null;
  createdAt: Date | string;
};

@Injectable()
export class AuditRepository {
  private readonly logs: AuditRecord[] = [];
  private inMemoryId = 1;

  constructor(@Optional() private readonly sqlStore?: SqlStoreService) {}

  async create(
    input: Omit<AuditRecord, 'id' | 'createdAt'>,
  ): Promise<AuditRecord> {
    const createdAt = new Date().toISOString();

    if (!this.isSqlEnabled()) {
      const record: AuditRecord = {
        id: this.inMemoryId++,
        actorUserId: input.actorUserId,
        branchId: input.branchId,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
        createdAt,
      };

      this.logs.unshift(record);
      return record;
    }

    await this.sqlStore!.execute(
      `INSERT INTO audit_logs (actor_user_id, branch_id, action, entity_type, entity_id, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.actorUserId,
        input.branchId ?? null,
        input.action,
        input.entityType,
        input.entityId,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    );

    const rows = await this.sqlStore!.query<AuditRow>(
      `SELECT
         id,
         actor_user_id AS actorUserId,
         branch_id AS branchId,
         action,
         entity_type AS entityType,
         entity_id AS entityId,
         metadata,
         created_at AS createdAt
       FROM audit_logs
       ORDER BY id DESC
       LIMIT 1`,
    );

    return this.mapRow(rows[0]);
  }

  async list(): Promise<AuditRecord[]> {
    if (!this.isSqlEnabled()) {
      return [...this.logs];
    }

    const rows = await this.sqlStore!.query<AuditRow>(
      `SELECT
         id,
         actor_user_id AS actorUserId,
         branch_id AS branchId,
         action,
         entity_type AS entityType,
         entity_id AS entityId,
         metadata,
         created_at AS createdAt
       FROM audit_logs
       ORDER BY created_at DESC`,
    );

    return rows.map((row) => this.mapRow(row));
  }

  private isSqlEnabled(): boolean {
    return this.sqlStore?.isEnabled() ?? false;
  }

  private mapRow(row: AuditRow): AuditRecord {
    return {
      id: Number(row.id),
      actorUserId: row.actorUserId,
      branchId: row.branchId ?? undefined,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: this.parseMetadata(row.metadata),
      createdAt: new Date(row.createdAt).toISOString(),
    };
  }

  private parseMetadata(
    raw: string | null,
  ): Record<string, unknown> | undefined {
    if (!raw) {
      return undefined;
    }

    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
}
