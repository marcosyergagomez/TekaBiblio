import { ForbiddenException } from '@nestjs/common';
import { RequestUser, UserRole } from '../auth/user-role.enum';

export function isBranchStaff(user?: RequestUser): boolean {
  return (
    user?.role === UserRole.ADMIN_SEDE || user?.role === UserRole.BIBLIOTECARIO
  );
}

export function enforceMemberScope(
  user: RequestUser | undefined,
  ownerMemberId: string,
): void {
  if (user?.role !== UserRole.SOCIO) {
    return;
  }

  if (!user.memberId || user.memberId !== ownerMemberId) {
    throw new ForbiddenException('Out-of-scope member access');
  }
}

export function enforceBranchScope(
  user: RequestUser | undefined,
  relatedBranchIds: Array<string | undefined>,
): void {
  if (!isBranchStaff(user)) {
    return;
  }

  if (!user?.branchId) {
    throw new ForbiddenException('Branch scope requires a branch id');
  }

  if (!relatedBranchIds.includes(user.branchId)) {
    throw new ForbiddenException('Out-of-scope branch access');
  }
}

export function scopedMemberFilter(
  user: RequestUser | undefined,
  requested?: string,
): string | undefined {
  if (user?.role === UserRole.SOCIO) {
    if (!user.memberId) {
      throw new ForbiddenException('Member scope requires a member id');
    }

    return user.memberId;
  }

  return requested;
}

export function branchScopeId(user?: RequestUser): string | undefined {
  if (!isBranchStaff(user)) {
    return undefined;
  }

  if (!user?.branchId) {
    throw new ForbiddenException('Branch scope requires a branch id');
  }

  return user.branchId;
}

export function assertBranchFilter(
  user: RequestUser | undefined,
  requested?: string,
): void {
  const scope = branchScopeId(user);
  if (!scope || !requested || requested === scope) {
    return;
  }

  throw new ForbiddenException('Out-of-scope branch access');
}
