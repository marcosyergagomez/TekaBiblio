import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { RequestUser, UserRole } from '../user-role.enum';

@Injectable()
export class HeaderAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
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
    const bearer = this.extractBearerToken(request.headers.authorization);

    if (bearer) {
      request.user = await this.authService.verifyAccessToken(bearer);
      return true;
    }

    if (!this.isInsecureHeaderAuthEnabled()) {
      throw new UnauthorizedException(
        'Missing or invalid Authorization bearer token',
      );
    }

    const roleHeader = request.headers['x-user-role'];
    const userIdHeader = request.headers['x-user-id'];
    const branchIdHeader = request.headers['x-branch-id'];
    const memberIdHeader = request.headers['x-member-id'];

    const role = this.normalizeHeader(roleHeader);
    const userId = this.normalizeHeader(userIdHeader);

    if (!role || !userId || !this.isValidRole(role)) {
      throw new UnauthorizedException(
        'Missing auth headers. Required: x-user-id and x-user-role. Optional: x-branch-id, x-member-id',
      );
    }

    request.user = {
      userId,
      role,
      branchId: this.normalizeHeader(branchIdHeader),
      memberId: this.normalizeHeader(memberIdHeader),
    };

    return true;
  }

  private normalizeHeader(
    value: string | string[] | undefined,
  ): string | undefined {
    if (typeof value === 'string') {
      return value;
    }

    if (Array.isArray(value) && value.length > 0) {
      return value[0];
    }

    return undefined;
  }

  private extractBearerToken(
    authorization: string | undefined,
  ): string | undefined {
    if (!authorization) {
      return undefined;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private isValidRole(value: string): value is UserRole {
    return Object.values(UserRole).includes(value as UserRole);
  }

  private isInsecureHeaderAuthEnabled(): boolean {
    return (
      process.env.NODE_ENV === 'test' ||
      process.env.ALLOW_INSECURE_HEADER_AUTH === '1'
    );
  }
}
