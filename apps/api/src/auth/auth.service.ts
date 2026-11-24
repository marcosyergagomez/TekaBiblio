import { Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { RowDataPacket } from 'mysql2/promise';
import { SignOptions, sign, verify } from 'jsonwebtoken';
import { SqlStoreService } from '../database/sql-store.service';
import { RequestUser, UserRole } from './user-role.enum';

type LoginRow = RowDataPacket & {
  userId: string;
  passwordHash: string;
  role: string;
  branchId: string | null;
  memberId: string | null;
  status: string;
};

type JwtPayload = {
  sub: string;
  sid: string;
  role: UserRole;
  branchId?: string;
  memberId?: string;
  iat?: number;
  exp?: number;
};

type SessionRow = RowDataPacket & {
  sessionId: string;
  userId: string;
  role: string;
  branchId: string | null;
  memberId: string | null;
  refreshHash: string;
  expiresAt: Date | string;
  revokedAt: Date | string | null;
};

type CountRow = RowDataPacket & {
  total: number;
};

type StoredSession = {
  sessionId: string;
  user: RequestUser;
  refreshHash: string;
  expiresAt: string;
  revokedAt?: string;
};

type UserAccount = {
  user: RequestUser;
  passwordHash: string;
};

const SEED_PASSWORD_HASH =
  'scrypt:a1b2c3d4e5f60718293a4b5c6d7e8f90:925463ddf3313a26df774e5391fadb3276325b1f37dca4825f926dacec80577c';

const DUMMY_PASSWORD_HASH =
  'scrypt:ffffffffffffffffffffffffffffffff:0000000000000000000000000000000000000000000000000000000000000000';

const IN_MEMORY_USERS: Array<{
  email: string;
  userId: string;
  passwordHash: string;
  role: UserRole;
  branchId?: string;
  memberId?: string;
}> = [
  {
    email: 'admin.global@tekabiblio.local',
    userId: 'u_admin_global',
    passwordHash: SEED_PASSWORD_HASH,
    role: UserRole.ADMIN_GLOBAL,
    branchId: 'branch_centro',
  },
  {
    email: 'admin.norte@tekabiblio.local',
    userId: 'u_admin_norte',
    passwordHash: SEED_PASSWORD_HASH,
    role: UserRole.ADMIN_SEDE,
    branchId: 'branch_norte',
  },
  {
    email: 'biblio.norte@tekabiblio.local',
    userId: 'u_biblio_norte',
    passwordHash: SEED_PASSWORD_HASH,
    role: UserRole.BIBLIOTECARIO,
    branchId: 'branch_norte',
  },
  {
    email: 'socio.bronce@tekabiblio.local',
    userId: 'u_member_bronce',
    passwordHash: SEED_PASSWORD_HASH,
    role: UserRole.SOCIO,
    branchId: 'branch_sur',
    memberId: 'mbr_bronce_01',
  },
  {
    email: 'socio.plata@tekabiblio.local',
    userId: 'u_member_plata',
    passwordHash: SEED_PASSWORD_HASH,
    role: UserRole.SOCIO,
    branchId: 'branch_este',
    memberId: 'mbr_plata_01',
  },
  {
    email: 'socio.oro@tekabiblio.local',
    userId: 'u_member_oro',
    passwordHash: SEED_PASSWORD_HASH,
    role: UserRole.SOCIO,
    branchId: 'branch_oeste',
    memberId: 'mbr_oro_01',
  },
];

@Injectable()
export class AuthService {
  private readonly inMemorySessions = new Map<string, StoredSession>();

  constructor(@Optional() private readonly sqlStore?: SqlStoreService) {}

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: RequestUser }> {
    const normalizedEmail = email.trim().toLowerCase();
    const account = this.isSqlEnabled()
      ? await this.resolveUserAccountFromSql(normalizedEmail)
      : this.resolveUserAccountFromMemory(normalizedEmail);

    if (!account || !this.verifyPassword(password, account.passwordHash)) {
      if (!account) {
        this.verifyPassword(password, DUMMY_PASSWORD_HASH);
      }

      throw new UnauthorizedException('Invalid credentials');
    }

    const user = account.user;

    await this.pruneExpiredSessions();
    const session = await this.createRefreshSession(user);

    return {
      accessToken: this.signAccessToken(user, session.sessionId),
      refreshToken: session.refreshToken,
      user,
    };
  }

  async refreshSession(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    user: RequestUser;
  }> {
    await this.pruneExpiredSessions();
    const session = await this.getSessionFromRefreshToken(refreshToken);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const now = new Date();
    const expiresAt = new Date(session.expiresAt);

    if (session.revokedAt) {
      await this.revokeAllUserSessions(session.user.userId);
      throw new UnauthorizedException('Refresh token already revoked');
    }

    if (expiresAt.getTime() <= now.getTime()) {
      await this.revokeSession(session.sessionId);
      throw new UnauthorizedException('Refresh token expired');
    }

    await this.revokeSession(session.sessionId);
    const nextSession = await this.createRefreshSession(session.user);

    return {
      accessToken: this.signAccessToken(session.user, nextSession.sessionId),
      refreshToken: nextSession.refreshToken,
      user: session.user,
    };
  }

  async revokeSessionByRefreshToken(
    refreshToken: string,
  ): Promise<{ revoked: boolean }> {
    const session = await this.getSessionFromRefreshToken(refreshToken);

    if (!session || session.revokedAt) {
      return { revoked: false };
    }

    await this.revokeSession(session.sessionId);
    return { revoked: true };
  }

  async revokeAllSessionsForUser(
    userId: string,
  ): Promise<{ revokedCount: number }> {
    const revokedCount = await this.revokeAllUserSessions(userId);
    return { revokedCount };
  }

  getCurrentProfile(user: RequestUser): { user: RequestUser } {
    return { user };
  }

  async verifyAccessToken(token: string): Promise<RequestUser> {
    try {
      const payload = verify(token, this.jwtSecret(), {
        algorithms: ['HS256'],
      }) as JwtPayload;

      if (
        !payload?.sub ||
        !payload?.sid ||
        !payload?.role ||
        !Object.values(UserRole).includes(payload.role)
      ) {
        throw new UnauthorizedException('Invalid bearer token payload');
      }

      const session = await this.findSession(payload.sid);
      if (
        !session ||
        session.revokedAt ||
        session.user.userId !== payload.sub ||
        new Date(session.expiresAt).getTime() <= Date.now()
      ) {
        throw new UnauthorizedException('Invalid or expired bearer token');
      }

      return session.user;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired bearer token');
    }
  }

  private signAccessToken(user: RequestUser, sessionId: string): string {
    const expiresIn = (process.env.JWT_EXPIRES_IN ??
      '8h') as SignOptions['expiresIn'];

    const payload: JwtPayload = {
      sub: user.userId,
      sid: sessionId,
      role: user.role,
      branchId: user.branchId,
      memberId: user.memberId,
    };

    return sign(payload, this.jwtSecret(), {
      algorithm: 'HS256',
      expiresIn,
    });
  }

  private async createRefreshSession(user: RequestUser): Promise<{
    refreshToken: string;
    sessionId: string;
  }> {
    const sessionId = randomUUID();
    const tokenSecret = randomBytes(48).toString('hex');
    const refreshToken = `${sessionId}.${tokenSecret}`;
    const refreshHash = this.hashTokenSecret(tokenSecret);
    const expiresAt = this.getRefreshExpiryIso();

    const session: StoredSession = {
      sessionId,
      user,
      refreshHash,
      expiresAt,
    };

    await this.saveSession(session);
    return { refreshToken, sessionId };
  }

  private async getSessionFromRefreshToken(
    refreshToken: string,
  ): Promise<StoredSession | null> {
    const parsed = this.parseRefreshToken(refreshToken);

    if (!parsed) {
      return null;
    }

    const session = await this.findSession(parsed.sessionId);

    if (!session) {
      return null;
    }

    if (
      !this.hashesMatch(
        session.refreshHash,
        this.hashTokenSecret(parsed.secret),
      )
    ) {
      return null;
    }

    return session;
  }

  private parseRefreshToken(
    refreshToken: string,
  ): { sessionId: string; secret: string } | null {
    const separator = refreshToken.indexOf('.');
    if (separator <= 0 || separator === refreshToken.length - 1) {
      return null;
    }

    return {
      sessionId: refreshToken.slice(0, separator),
      secret: refreshToken.slice(separator + 1),
    };
  }

  private hashesMatch(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }

  private hashTokenSecret(secret: string): string {
    return createHash('sha256').update(secret).digest('hex');
  }

  private getRefreshExpiryIso(): string {
    const parsedDays = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 14);
    const days =
      Number.isFinite(parsedDays) && parsedDays > 0
        ? Math.floor(parsedDays)
        : 14;
    const now = new Date();
    now.setUTCDate(now.getUTCDate() + days);
    return now.toISOString();
  }

  private async saveSession(session: StoredSession): Promise<void> {
    if (this.isSqlEnabled()) {
      await this.sqlStore!.execute(
        `INSERT INTO auth_sessions (
           id, user_id, role, branch_id, member_id, refresh_hash, expires_at, revoked_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          session.sessionId,
          session.user.userId,
          session.user.role,
          session.user.branchId ?? null,
          session.user.memberId ?? null,
          session.refreshHash,
          this.toMysqlDateTime(session.expiresAt),
          session.revokedAt ? this.toMysqlDateTime(session.revokedAt) : null,
        ],
      );
      return;
    }

    this.inMemorySessions.set(session.sessionId, session);
  }

  private async findSession(sessionId: string): Promise<StoredSession | null> {
    if (this.isSqlEnabled()) {
      const rows = await this.sqlStore!.query<SessionRow>(
        `SELECT
             id AS sessionId,
             user_id AS userId,
             role,
             branch_id AS branchId,
             member_id AS memberId,
             refresh_hash AS refreshHash,
             expires_at AS expiresAt,
             revoked_at AS revokedAt
           FROM auth_sessions
           WHERE id = ?
           LIMIT 1`,
        [sessionId],
      );

      const row = rows[0];
      if (!row || !this.isValidRole(row.role)) {
        return null;
      }

      return {
        sessionId: row.sessionId,
        user: {
          userId: row.userId,
          role: row.role,
          branchId: row.branchId ?? undefined,
          memberId: row.memberId ?? undefined,
        },
        refreshHash: row.refreshHash,
        expiresAt: new Date(row.expiresAt).toISOString(),
        revokedAt: row.revokedAt
          ? new Date(row.revokedAt).toISOString()
          : undefined,
      };
    }

    return this.inMemorySessions.get(sessionId) ?? null;
  }

  private async revokeSession(sessionId: string): Promise<void> {
    const revokedAtIso = new Date().toISOString();

    if (this.isSqlEnabled()) {
      await this.sqlStore!.execute(
        `UPDATE auth_sessions
         SET revoked_at = ?
         WHERE id = ? AND revoked_at IS NULL`,
        [this.toMysqlDateTime(revokedAtIso), sessionId],
      );
      return;
    }

    const session = this.inMemorySessions.get(sessionId);
    if (session) {
      session.revokedAt = revokedAtIso;
      this.inMemorySessions.set(sessionId, session);
    }
  }

  private async revokeAllUserSessions(userId: string): Promise<number> {
    const revokedAtIso = new Date().toISOString();
    let revokedCount = 0;

    if (this.isSqlEnabled()) {
      const rows = await this.sqlStore!.query<CountRow>(
        `SELECT COUNT(*) AS total
         FROM auth_sessions
         WHERE user_id = ? AND revoked_at IS NULL`,
        [userId],
      );

      revokedCount = Number(rows[0]?.total ?? 0);

      await this.sqlStore!.execute(
        `UPDATE auth_sessions
         SET revoked_at = ?
         WHERE user_id = ? AND revoked_at IS NULL`,
        [this.toMysqlDateTime(revokedAtIso), userId],
      );
      return revokedCount;
    }

    for (const [sessionId, session] of this.inMemorySessions.entries()) {
      if (session.user.userId !== userId || session.revokedAt) {
        continue;
      }

      session.revokedAt = revokedAtIso;
      this.inMemorySessions.set(sessionId, session);
      revokedCount += 1;
    }

    return revokedCount;
  }

  private async pruneExpiredSessions(): Promise<void> {
    const now = new Date();

    if (this.isSqlEnabled()) {
      await this.sqlStore!.execute(
        `DELETE FROM auth_sessions
         WHERE expires_at < ?
         LIMIT 500`,
        [this.toMysqlDateTime(now.toISOString())],
      );
      return;
    }

    for (const [sessionId, session] of this.inMemorySessions.entries()) {
      if (new Date(session.expiresAt).getTime() >= now.getTime()) {
        continue;
      }

      this.inMemorySessions.delete(sessionId);
    }
  }

  private async resolveUserAccountFromSql(
    email: string,
  ): Promise<UserAccount | null> {
    const rows = await this.sqlStore!.query<LoginRow>(
      `SELECT
         u.id AS userId,
         u.password_hash AS passwordHash,
         u.role AS role,
         u.branch_id AS branchId,
         m.id AS memberId,
         u.status AS status
       FROM users u
       LEFT JOIN members m ON m.user_id = u.id
       WHERE LOWER(u.email) = ?
       LIMIT 1`,
      [email],
    );

    const row = rows[0];
    if (!row || row.status !== 'ACTIVE' || !this.isValidRole(row.role)) {
      return null;
    }

    return {
      user: {
        userId: row.userId,
        role: row.role,
        branchId: row.branchId ?? undefined,
        memberId: row.memberId ?? undefined,
      },
      passwordHash: row.passwordHash,
    };
  }

  private resolveUserAccountFromMemory(email: string): UserAccount | null {
    const user = IN_MEMORY_USERS.find(
      (item) => item.email.toLowerCase() === email,
    );

    if (!user) {
      return null;
    }

    return {
      user: {
        userId: user.userId,
        role: user.role,
        branchId: user.branchId,
        memberId: user.memberId,
      },
      passwordHash: user.passwordHash,
    };
  }

  private verifyPassword(password: string, storedHash: string): boolean {
    if (password.length < 8 || password.length > 128) {
      return false;
    }

    if (storedHash.startsWith('scrypt:')) {
      return verifyStoredPassword(password, storedHash);
    }

    return false;
  }

  private isSqlEnabled(): boolean {
    return this.sqlStore?.isEnabled() ?? false;
  }

  private toMysqlDateTime(value: string): string {
    return value.slice(0, 19).replace('T', ' ');
  }

  private isValidRole(value: string): value is UserRole {
    return Object.values(UserRole).includes(value as UserRole);
  }

  private jwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    const allowInsecureDevSecret =
      process.env.NODE_ENV !== 'production' &&
      process.env.ALLOW_INSECURE_JWT_FOR_DEV === '1';

    if (
      secret &&
      (allowInsecureDevSecret ||
        (secret !== 'dev-secret-change-me' && secret.length >= 32))
    ) {
      return secret;
    }

    if (process.env.NODE_ENV === 'test') {
      return 'test-only-insecure-jwt-secret';
    }

    throw new Error(
      'JWT_SECRET must be set with at least 32 characters and cannot use insecure defaults',
    );
  }
}

const SCRYPT_KEY_LENGTH = 32;

function verifyStoredPassword(password: string, storedHash: string): boolean {
  if (storedHash.startsWith('scrypt:')) {
    const [, salt, expectedHex] = storedHash.split(':');
    if (!salt || !expectedHex) {
      return false;
    }

    const actual = scryptSync(password, salt, SCRYPT_KEY_LENGTH);
    const expected = Buffer.from(expectedHex, 'hex');
    if (actual.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(actual, expected);
  }

  return false;
}
