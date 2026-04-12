import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '../database/database.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BranchScopeGuard } from './guards/branch-scope.guard';
import { HeaderAuthGuard } from './guards/header-auth.guard';
import { MemberScopeGuard } from './guards/member-scope.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: HeaderAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: BranchScopeGuard,
    },
    {
      provide: APP_GUARD,
      useClass: MemberScopeGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
