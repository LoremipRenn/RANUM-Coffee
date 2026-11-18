import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  CloseSessionDto,
  CreateStaffRequestDto,
  CreateTableDto,
  TablesService,
  UpdateQrStatusDto,
  UpdateTableDto,
} from './tables.service.js';

@ApiTags('Tables & QR')
@Controller()
export class TablesController {
  constructor(private readonly tablesService: TablesService) {}

  @Get('public/qr/:token')
  validateQr(@Param('token') token: string) {
    return this.tablesService.validateQrToken(token);
  }

  @Throttle({ medium: { limit: 6, ttl: 60000 } })
  @Post('public/qr/:token/requests')
  createStaffRequest(@Param('token') token: string, @Body() dto: CreateStaffRequestDto) {
    return this.tablesService.createCustomerStaffRequest(token, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.BARISTA, Role.WAITER)
  @Get('staff/tables')
  listTables(@CurrentUser() user: AuthenticatedUser) {
    return this.tablesService.listStaffTables(user.branchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('staff/tables')
  createTable(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTableDto) {
    return this.tablesService.createTable(user.branchId, user.id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('staff/tables/:id')
  updateTable(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.updateTable(user.branchId, user.id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('staff/tables/:id/qr/regenerate')
  regenerateQr(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tablesService.regenerateQr(user.branchId, user.id, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('staff/tables/:id/qr/status')
  updateQrStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateQrStatusDto,
  ) {
    return this.tablesService.updateQrStatus(user.branchId, user.id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER)
  @Get('staff/tables/:id/qr/image')
  getQrImage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tablesService.getQrImage(user.branchId, id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER)
  @Post('staff/sessions/:id/close')
  closeSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CloseSessionDto,
  ) {
    return this.tablesService.closeTableSession(user.branchId, user.id, user.role, id, dto);
  }
}
