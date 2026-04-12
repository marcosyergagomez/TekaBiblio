import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(() => {
    service = new AuthService();
  });

  it('issues access and refresh tokens on login', async () => {
    const result = await service.login(
      'admin.global@tekabiblio.local',
      'Demo12345!',
    );

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.userId).toBe('u_admin_global');
  });

  it('rotates refresh token on refresh endpoint flow', async () => {
    const login = await service.login(
      'socio.oro@tekabiblio.local',
      'Demo12345!',
    );
    const refreshed = await service.refreshSession(login.refreshToken);

    expect(refreshed.accessToken).toBeDefined();
    expect(refreshed.refreshToken).toBeDefined();
    expect(refreshed.refreshToken).not.toBe(login.refreshToken);
    expect(refreshed.user.memberId).toBe('mbr_oro_01');
  });

  it('revokes refresh token and blocks further refresh', async () => {
    const login = await service.login(
      'socio.plata@tekabiblio.local',
      'Demo12345!',
    );
    const revoked = await service.revokeSessionByRefreshToken(
      login.refreshToken,
    );

    expect(revoked.revoked).toBe(true);

    await expect(service.refreshSession(login.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('revokes all active sessions for a user', async () => {
    const loginOne = await service.login(
      'socio.oro@tekabiblio.local',
      'Demo12345!',
    );
    const loginTwo = await service.login(
      'socio.oro@tekabiblio.local',
      'Demo12345!',
    );

    const result = await service.revokeAllSessionsForUser('u_member_oro');

    expect(result.revokedCount).toBeGreaterThanOrEqual(2);
    await expect(service.refreshSession(loginOne.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.refreshSession(loginTwo.refreshToken)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
