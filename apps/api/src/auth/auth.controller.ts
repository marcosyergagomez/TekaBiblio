import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthService } from './auth.service';
import { RequestUser } from './user-role.enum';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: LoginDto) {
    return this.authService.login(body.email, body.password);
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshSession(body.refreshToken);
  }

  @Public()
  @Post('logout')
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.revokeSessionByRefreshToken(body.refreshToken);
  }

  @Post('logout-all')
  async logoutAll(@Req() req: Request & { user?: RequestUser }) {
    if (!req.user) {
      throw new UnauthorizedException('Missing authenticated user context');
    }

    return this.authService.revokeAllSessionsForUser(req.user.userId);
  }

  @Get('me')
  me(@Req() req: Request & { user?: RequestUser }) {
    if (!req.user) {
      throw new UnauthorizedException('Missing authenticated user context');
    }

    return this.authService.getCurrentProfile(req.user);
  }
}
