import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { CreateLoanPenaltyDto } from './dto/create-loan-penalty.dto';
import { CreatePenaltyDto } from './dto/create-penalty.dto';
import { ListPenaltiesDto } from './dto/list-penalties.dto';
import { WaivePenaltyDto } from './dto/waive-penalty.dto';
import { PenaltiesService } from './penalties.service';

@Controller('penalties')
export class PenaltiesController {
  constructor(private readonly penaltiesService: PenaltiesService) {}

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Get()
  async list(
    @Query() query: ListPenaltiesDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const scopedQuery = {
      ...query,
    };

    if (req.user?.role === UserRole.SOCIO && req.user.memberId) {
      scopedQuery.memberId = req.user.memberId;
    }

    return this.penaltiesService.listPenalties(scopedQuery, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post()
  async create(
    @Body() body: CreatePenaltyDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.penaltiesService.createPenalty(body, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post('from-loan')
  async createFromLoan(
    @Body() body: CreateLoanPenaltyDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.penaltiesService.createPenaltyFromLoan(body, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE)
  @Post(':penaltyId/waive')
  async waive(
    @Param('penaltyId') penaltyId: string,
    @Body() body: WaivePenaltyDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.penaltiesService.waivePenalty(penaltyId, body, req.user);
  }
}
