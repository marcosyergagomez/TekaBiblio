import { Controller, Get, Query, Req } from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestUser, UserRole } from '../auth/user-role.enum';
import { PopularityReportDto } from './dto/popularity-report.dto';
import { ReportRangeDto } from './dto/report-range.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Get('income')
  async income(
    @Query() query: ReportRangeDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.reportsService.getIncomeReport(query, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Get('losses')
  async losses(
    @Query() query: ReportRangeDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.reportsService.getLossesReport(query, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Get('popularity')
  async popularity(
    @Query() query: PopularityReportDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.reportsService.getPopularityReport(query, req.user);
  }

  @Roles(UserRole.ADMIN_GLOBAL, UserRole.ADMIN_SEDE, UserRole.BIBLIOTECARIO)
  @Get('dashboard')
  async dashboard(
    @Query() query: PopularityReportDto,
    @Req() req: Request & { user?: RequestUser },
  ) {
    return this.reportsService.getDashboard(query, req.user);
  }
}
