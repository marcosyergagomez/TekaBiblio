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

type BranchRow = RowDataPacket & { branchId: string };

@Injectable()
export class BranchScopeGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sqlStore: SqlStoreService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic || !this.sqlStore.isEnabled()) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: RequestUser }>();
    const user = request.user;

    if (!user) {
      return true;
    }

    if (
      user.role !== UserRole.ADMIN_SEDE &&
      user.role !== UserRole.BIBLIOTECARIO
    ) {
      return true;
    }

    const branchId = user.branchId;
    if (!branchId) {
      throw new ForbiddenException(
        'Branch scope requires x-branch-id for admin_sede and bibliotecario',
      );
    }

    const scopedBranchId = await this.resolveScopedBranchId(request);
    if (!scopedBranchId) {
      return true;
    }

    if (scopedBranchId !== branchId) {
      throw new ForbiddenException(
        `Out-of-scope branch access. User branch ${branchId} cannot operate over ${scopedBranchId}`,
      );
    }

    return true;
  }

  private async resolveScopedBranchId(
    request: Request & { user?: RequestUser },
  ): Promise<string | undefined> {
    const body = request.body as Record<string, unknown>;
    const query = request.query as Record<string, unknown>;
    const method = request.method.toUpperCase();
    const path = request.path;

    if (method === 'POST' && path === '/materials') {
      return this.valueAsString(body.homeBranchId);
    }

    if (method === 'GET' && path === '/materials') {
      return this.valueAsString(query.homeBranchId) ?? request.user?.branchId;
    }

    const materialMatch = path.match(/^\/materials\/([^/]+)$/);
    if ((method === 'PATCH' || method === 'DELETE') && materialMatch) {
      return this.getMaterialHomeBranch(materialMatch[1]);
    }

    if (method === 'POST' && path === '/copies') {
      return this.valueAsString(body.branchId);
    }

    if (method === 'GET' && path === '/copies') {
      return this.valueAsString(query.branchId) ?? request.user?.branchId;
    }

    const copyStatusMatch = path.match(/^\/copies\/([^/]+)\/status$/);
    if (method === 'PATCH' && copyStatusMatch) {
      return this.getCopyBranch(copyStatusMatch[1]);
    }

    if (method === 'POST' && path === '/loans') {
      return this.valueAsString(body.pickupBranchId);
    }

    if (method === 'GET' && path === '/loans') {
      return (
        this.valueAsString(query.pickupBranchId) ??
        this.valueAsString(query.sourceBranchId) ??
        request.user?.branchId
      );
    }

    const loanMatch = path.match(/^\/loans\/([^/]+)$/);
    if (method === 'GET' && loanMatch) {
      return this.getLoanTargetBranch(loanMatch[1]);
    }

    if (
      method === 'POST' &&
      (path === '/loans/renew' || path === '/loans/return')
    ) {
      const loanId = this.valueAsString(body.loanId);
      if (!loanId) {
        return undefined;
      }

      return this.getLoanTargetBranch(loanId);
    }

    if (method === 'POST' && path === '/reservations') {
      return this.valueAsString(body.pickupBranchId);
    }

    if (method === 'GET' && path === '/reservations') {
      return this.valueAsString(query.pickupBranchId) ?? request.user?.branchId;
    }

    const reservationMatch = path.match(/^\/reservations\/([^/]+)$/);
    if (method === 'GET' && reservationMatch) {
      return this.getReservationPickupBranch(reservationMatch[1]);
    }

    const reservationReadyMatch = path.match(
      /^\/reservations\/([^/]+)\/mark-ready$/,
    );
    if (method === 'POST' && reservationReadyMatch) {
      return this.getReservationPickupBranch(reservationReadyMatch[1]);
    }

    const shipmentMatch = path.match(/^\/shipments\/([^/]+)$/);
    if (method === 'GET' && shipmentMatch) {
      return this.getShipmentTargetBranch(shipmentMatch[1]);
    }

    if (method === 'GET' && path === '/shipments') {
      return this.valueAsString(query.toBranchId) ?? request.user?.branchId;
    }

    const shipmentStatusMatch = path.match(/^\/shipments\/([^/]+)\/status$/);
    if (method === 'POST' && shipmentStatusMatch) {
      return this.getShipmentTargetBranch(shipmentStatusMatch[1]);
    }

    if (method === 'GET' && path.startsWith('/reports/')) {
      return this.valueAsString(query.branchId) ?? request.user?.branchId;
    }

    if (method === 'GET' && path === '/audit-logs') {
      return this.valueAsString(query.branchId) ?? request.user?.branchId;
    }

    if (method === 'GET' && path === '/penalties') {
      const memberId = this.valueAsString(query.memberId);
      if (memberId) {
        return this.getMemberHomeBranch(memberId);
      }

      return request.user?.branchId;
    }

    if (method === 'POST' && path === '/penalties') {
      return this.getMemberHomeBranch(this.valueAsString(body.memberId));
    }

    if (method === 'POST' && path === '/penalties/from-loan') {
      const loanId = this.valueAsString(body.loanId);
      if (!loanId) {
        return undefined;
      }

      return this.getLoanTargetBranch(loanId);
    }

    const penaltyWaiveMatch = path.match(/^\/penalties\/([^/]+)\/waive$/);
    if (method === 'POST' && penaltyWaiveMatch) {
      return this.getPenaltyMemberBranch(penaltyWaiveMatch[1]);
    }

    if (method === 'GET' && path === '/payments') {
      const memberId = this.valueAsString(query.memberId);
      if (memberId) {
        return this.getMemberHomeBranch(memberId);
      }

      return request.user?.branchId;
    }

    if (method === 'POST' && path === '/payments') {
      return this.getMemberHomeBranch(this.valueAsString(body.memberId));
    }

    return undefined;
  }

  private async getLoanTargetBranch(
    loanId: string,
  ): Promise<string | undefined> {
    const rows = await this.sqlStore.query<BranchRow>(
      'SELECT target_branch_id AS branchId FROM loans WHERE id = ? LIMIT 1',
      [loanId],
    );

    return rows[0]?.branchId;
  }

  private async getCopyBranch(copyId: string): Promise<string | undefined> {
    const rows = await this.sqlStore.query<BranchRow>(
      'SELECT branch_id AS branchId FROM copies WHERE id = ? LIMIT 1',
      [copyId],
    );

    return rows[0]?.branchId;
  }

  private async getMaterialHomeBranch(
    materialId: string,
  ): Promise<string | undefined> {
    const rows = await this.sqlStore.query<BranchRow>(
      'SELECT home_branch_id AS branchId FROM materials WHERE id = ? LIMIT 1',
      [materialId],
    );

    return rows[0]?.branchId;
  }

  private async getReservationPickupBranch(
    reservationId: string,
  ): Promise<string | undefined> {
    const rows = await this.sqlStore.query<BranchRow>(
      'SELECT pickup_branch_id AS branchId FROM reservations WHERE id = ? LIMIT 1',
      [reservationId],
    );

    return rows[0]?.branchId;
  }

  private async getShipmentTargetBranch(
    shipmentId: string,
  ): Promise<string | undefined> {
    const rows = await this.sqlStore.query<BranchRow>(
      'SELECT to_branch_id AS branchId FROM shipments WHERE id = ? LIMIT 1',
      [shipmentId],
    );

    return rows[0]?.branchId;
  }

  private async getMemberHomeBranch(
    memberId: string | undefined,
  ): Promise<string | undefined> {
    if (!memberId) {
      return undefined;
    }

    const rows = await this.sqlStore.query<BranchRow>(
      'SELECT home_branch_id AS branchId FROM members WHERE id = ? LIMIT 1',
      [memberId],
    );

    return rows[0]?.branchId;
  }

  private async getPenaltyMemberBranch(
    penaltyId: string,
  ): Promise<string | undefined> {
    const rows = await this.sqlStore.query<BranchRow>(
      `SELECT m.home_branch_id AS branchId
       FROM penalties p
       INNER JOIN members m ON m.id = p.member_id
       WHERE p.id = ?
       LIMIT 1`,
      [penaltyId],
    );

    return rows[0]?.branchId;
  }

  private valueAsString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }
}
