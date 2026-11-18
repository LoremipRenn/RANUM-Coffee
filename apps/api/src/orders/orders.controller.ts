import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrderStatus, Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { CreateOrderDto, OrdersService, UpdateOrderStatusDto } from './orders.service.js';

@ApiTags('Orders')
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Throttle({ short: { limit: 3, ttl: 1000 }, medium: { limit: 12, ttl: 60000 } })
  @Post('public/orders')
  createOrder(
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.ordersService.createPublicOrder(dto, idempotencyKey);
  }

  @Get('public/orders/:accessToken')
  getOrder(@Param('accessToken') accessToken: string) {
    return this.ordersService.getPublicOrder(accessToken);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.BARISTA, Role.WAITER)
  @Get('staff/orders')
  listStaffOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: OrderStatus,
    @Query('tableId') tableId?: string,
    @Query('q') q?: string,
    @Query('date') date?: string,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : 50;
    return this.ordersService.listStaffOrders(user.branchId, {
      status,
      tableId,
      q: q?.trim() || undefined,
      date,
      limit: Number.isFinite(parsedLimit) ? parsedLimit : 50,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER, Role.BARISTA, Role.WAITER)
  @Patch('staff/orders/:id/status')
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStaffOrderStatus(user.branchId, user.id, user.role, id, dto);
  }
}
