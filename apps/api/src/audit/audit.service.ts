import { Injectable } from '@nestjs/common';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { paginateFromQuery } from '../common/pagination';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { AuditRepository } from './audit.repository';

@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}

  async recordEvent(input: {
    actorUserId: string;
    branchId?: string;
    action: string;
    entityType: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.auditRepository.create(input);
  }

  async listLogs(query: ListAuditLogsDto, user?: RequestUser) {
    let items = await this.auditRepository.list();

    if (query.actorUserId) {
      items = items.filter((item) => item.actorUserId === query.actorUserId);
    }

    if (query.branchId) {
      items = items.filter((item) => item.branchId === query.branchId);
    }

    if (query.action) {
      items = items.filter((item) => item.action === query.action);
    }

    if (query.entityType) {
      items = items.filter((item) => item.entityType === query.entityType);
    }

    if (
      (user?.role === UserRole.ADMIN_SEDE ||
        user?.role === UserRole.BIBLIOTECARIO) &&
      user.branchId
    ) {
      items = items.filter((item) => item.branchId === user.branchId);
    }

    return paginateFromQuery(items, query, 50);
  }
}
