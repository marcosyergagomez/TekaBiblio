import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SqlStoreService } from '../../database/sql-store.service';
import { RequestUser, UserRole } from '../user-role.enum';
import { MemberScopeGuard } from './member-scope.guard';

type RequestShape = {
  method: string;
  path: string;
  body?: Record<string, unknown>;
  user?: RequestUser;
};

function createContext(request: RequestShape): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ body: {}, ...request }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('MemberScopeGuard', () => {
  let guard: MemberScopeGuard;
  let reflector: { getAllAndOverride: jest.Mock };
  let sqlStore: { isEnabled: jest.Mock; query: jest.Mock };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    };

    sqlStore = {
      isEnabled: jest.fn().mockReturnValue(true),
      query: jest.fn(),
    };

    guard = new MemberScopeGuard(
      reflector as unknown as Reflector,
      sqlStore as unknown as SqlStoreService,
    );
  });

  it('allows non-socio users without member scope checks', async () => {
    const context = createContext({
      method: 'GET',
      path: '/loans/loan_1',
      user: {
        userId: 'u_admin',
        role: UserRole.ADMIN_GLOBAL,
      },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sqlStore.query).not.toHaveBeenCalled();
  });

  it('requires x-member-id for socio role', async () => {
    const context = createContext({
      method: 'POST',
      path: '/reservations',
      body: { memberId: 'member_1' },
      user: {
        userId: 'u_member',
        role: UserRole.SOCIO,
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('denies socio reservation creation for another member', async () => {
    const context = createContext({
      method: 'POST',
      path: '/reservations',
      body: { memberId: 'member_2' },
      user: {
        userId: 'u_member',
        role: UserRole.SOCIO,
        memberId: 'member_1',
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows socio reservation creation for own member', async () => {
    const context = createContext({
      method: 'POST',
      path: '/reservations',
      body: { memberId: 'member_1' },
      user: {
        userId: 'u_member',
        role: UserRole.SOCIO,
        memberId: 'member_1',
      },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('denies socio loan access when loan belongs to another member', async () => {
    sqlStore.query.mockResolvedValue([{ memberId: 'member_2' }]);

    const context = createContext({
      method: 'GET',
      path: '/loans/loan_1',
      user: {
        userId: 'u_member',
        role: UserRole.SOCIO,
        memberId: 'member_1',
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('allows socio loan access when loan belongs to same member', async () => {
    sqlStore.query.mockResolvedValue([{ memberId: 'member_1' }]);

    const context = createContext({
      method: 'GET',
      path: '/loans/loan_1',
      user: {
        userId: 'u_member',
        role: UserRole.SOCIO,
        memberId: 'member_1',
      },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });
});
