import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { CalculateLateFeeDto } from './dto/calculate-late-fee.dto';
import { CreateLoanDto } from './dto/create-loan.dto';
import { ListLoansDto } from './dto/list-loans.dto';
import { RenewLoanDto } from './dto/renew-loan.dto';
import { ReturnLoanDto } from './dto/return-loan.dto';
import { LoansService } from './loans.service';

@Controller('loans')
export class LoansController {
  constructor(private readonly loansService: LoansService) {}

  @Public()
  @Get('policies')
  getPolicies() {
    return this.loansService.getPolicies();
  }

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Get()
  async list(
    @Query() query: ListLoansDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.loansService.listLoans(query, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post()
  async create(
    @Body() body: CreateLoanDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.loansService.createLoan(body, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post('renew')
  async renew(
    @Body() body: RenewLoanDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.loansService.renewLoan(body, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post('return')
  async close(
    @Body() body: ReturnLoanDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.loansService.returnLoan(body, req.user);
  }

  @Public()
  @Post('late-fee')
  lateFee(@Body() body: CalculateLateFeeDto) {
    return this.loansService.calculateLateFee(body);
  }

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Get(':loanId')
  async findOne(
    @Param('loanId') loanId: string,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.loansService.findOne(loanId, req.user);
  }
}
