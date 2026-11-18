import { Controller, Get, MessageEvent, Param, Patch, Sse, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Observable } from 'rxjs';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { NotificationsService } from './notifications.service.js';

@ApiTags('Notifications')
@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse('public/orders/:accessToken/stream')
  streamOrder(@Param('accessToken') accessToken: string): Observable<MessageEvent> {
    return this.notificationsService.streamOrder(accessToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.BARISTA, Role.WAITER)
  @Sse('staff/stream')
  streamStaff(@CurrentUser() user: AuthenticatedUser): Observable<MessageEvent> {
    return this.notificationsService.streamStaff(user.branchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.BARISTA, Role.WAITER)
  @Get('staff/requests')
  listRequests(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.listOpenStaffRequests(user.branchId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.WAITER)
  @Patch('staff/requests/:id/resolve')
  resolveRequest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.notificationsService.resolveStaffRequest(user.branchId, id, user.id);
  }
}
