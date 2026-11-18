import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('staff/reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Roles(Role.ADMIN, Role.CASHIER)
  getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.getSummary(user.branchId, from, to);
  }

  @Get('timeseries')
  @Roles(Role.ADMIN, Role.CASHIER)
  getTimeseries(
    @CurrentUser() user: AuthenticatedUser,
    @Query('period') period?: 'day' | 'month' | 'year',
  ) {
    const safePeriod = period === 'month' || period === 'year' ? period : 'day';
    return this.reportsService.getRevenueTimeseries(user.branchId, safePeriod);
  }

  @Get('export')
  @Roles(Role.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="ranum-coffee-transactions.csv"')
  exportCsv(
    @CurrentUser() user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.reportsService.exportTransactionsCsv(user.branchId, from, to);
  }
}
