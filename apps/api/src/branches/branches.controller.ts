import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { BranchesService, UpdateBranchSettingsDto } from './branches.service.js';

@ApiTags('Branches')
@Controller()
export class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Get('public/outlet')
  getPublicOutlet() {
    return this.branchesService.getPublicOutlet();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.BARISTA, Role.WAITER)
  @Get('staff/outlet')
  getStaffOutlet(@CurrentUser() user: AuthenticatedUser) {
    return this.branchesService.getBranchById(user.branchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('staff/outlet')
  updateOutlet(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateBranchSettingsDto) {
    return this.branchesService.updateSettings(user.branchId, user.id, dto);
  }
}
