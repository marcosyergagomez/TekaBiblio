import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RowDataPacket } from 'mysql2/promise';
import { SqlStoreService } from '../../database/sql-store.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser, UserRole } from '../user-role.enum';

type MemberRow = RowDataPacket & { memberId: string | null };

@Injectable()
export class MemberScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sqlStore: SqlStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    if (!user || user.role !== UserRole.SOCIO) {
      return true;
    }

    if (!user.memberId) {
      throw new ForbiddenException(
        'Member scope requires x-member-id for socio role',
      );
    }

    const scopedMemberId = await this.resolveScopedMemberId(request);
    if (!scopedMemberId) {
      return true;
    }

    if (scopedMemberId !== user.memberId) {
      throw new ForbiddenException(
        `Out-of-scope member access. User member ${user.memberId} cannot access ${scopedMemberId}`,
      );
    }

    return true;
  }

  private async resolveScopedMemberId(
    request: Request & { user?: RequestUser },
  ): Promise<string | undefined> {
    const body = request.body as Record<string, unknown>;
    const query = request.query as Record<string, unknown>;
    const method = request.method.toUpperCase();
    const path = request.path;

    if (method === 'POST' && path === '/reservations') {
      return this.valueAsString(body.memberId);
    }

    if (method === 'GET' && path === '/loans') {
      return this.valueAsString(query.memberId) ?? request.user?.memberId;
    }

    if (method === 'GET' && path === '/reservations') {
      return this.valueAsString(query.memberId) ?? request.user?.memberId;
    }

    if (method === 'GET' && path === '/shipments') {
      return this.valueAsString(query.memberId) ?? request.user?.memberId;
    }

    if (method === 'GET' && path === '/penalties') {
      return this.valueAsString(query.memberId) ?? request.user?.memberId;
    }

    if (method === 'GET' && path === '/payments') {
      return this.valueAsString(query.memberId) ?? request.user?.memberId;
    }

    const loanMatch = path.match(/^\/loans\/([^/]+)$/);
    if (method === 'GET' && loanMatch) {
      return this.getLoanMember(loanMatch[1]);
    }

    const reservationMatch = path.match(/^\/reservations\/([^/]+)$/);
    if (method === 'GET' && reservationMatch) {
      return this.getReservationMember(reservationMatch[1]);
    }

    const shipmentMatch = path.match(/^\/shipments\/([^/]+)$/);
    if (method === 'GET' && shipmentMatch) {
      return this.getShipmentMember(shipmentMatch[1]);
    }

    return undefined;
  }

  private async getLoanMember(loanId: string): Promise<string | undefined> {
    if (!this.sqlStore.isEnabled()) {
      return undefined;
    }

    const rows = await this.sqlStore.query<MemberRow>(
      'SELECT member_id AS memberId FROM loans WHERE id = ? LIMIT 1',
      [loanId],
    );

    return rows[0]?.memberId ?? undefined;
  }

  private async getReservationMember(
    reservationId: string,
  ): Promise<string | undefined> {
    if (!this.sqlStore.isEnabled()) {
      return undefined;
    }

    const rows = await this.sqlStore.query<MemberRow>(
      'SELECT member_id AS memberId FROM reservations WHERE id = ? LIMIT 1',
      [reservationId],
    );

    return rows[0]?.memberId ?? undefined;
  }

  private async getShipmentMember(
    shipmentId: string,
  ): Promise<string | undefined> {
    if (!this.sqlStore.isEnabled()) {
      return undefined;
    }

    const rows = await this.sqlStore.query<MemberRow>(
      `SELECT COALESCE(r.member_id, l.member_id) AS memberId
       FROM shipments s
       LEFT JOIN reservations r ON r.id = s.reservation_id
       LEFT JOIN loans l ON l.id = s.loan_id
       WHERE s.id = ?
       LIMIT 1`,
      [shipmentId],
    );

    return rows[0]?.memberId ?? undefined;
  }

  private valueAsString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}
