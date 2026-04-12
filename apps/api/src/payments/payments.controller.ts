import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { ListPaymentsDto } from './dto/list-payments.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles(
    UserRole.ADMIN_GLOBAL,
    UserRole.ADMIN_SEDE,
    UserRole.BIBLIOTECARIO,
    UserRole.SOCIO,
  )
  @Get()
  async list(
    @Query() query: ListPaymentsDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    const scopedQuery = {
      ...query,
    };

    if (req.user?.role === UserRole.SOCIO && req.user.memberId) {
      scopedQuery.memberId = req.user.memberId;
    }

    return this.paymentsService.listPayments(scopedQuery, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Post()
  async register(
    @Body() body: RegisterPaymentDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.paymentsService.registerPayment(body, req.user);
  }
}
