import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { ListAuditLogsDto } from './dto/list-audit-logs.dto';
import { AuditService } from './audit.service';

@Controller('audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE)
  @Get()
  async list(
    @Query() query: ListAuditLogsDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.auditService.listLogs(query, req.user);
  }
}
