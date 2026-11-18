import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PaymentStatus, Role } from '@prisma/client';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import {
  CreateSnapPaymentDto,
  type MidtransWebhookPayload,
  PaymentsService,
  RecordCashPaymentDto,
} from './payments.service.js';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Throttle({ medium: { limit: 10, ttl: 60000 } })
  @Post('public/orders/:accessToken/payments/snap')
  createSnap(
    @Param('accessToken') accessToken: string,
    @Body() dto: CreateSnapPaymentDto,
  ) {
    return this.paymentsService.createSnapAttempt(accessToken, dto);
  }

  @Post('public/orders/:accessToken/payments/sync')
  syncStatus(@Param('accessToken') accessToken: string) {
    return this.paymentsService.syncPaymentStatusFromMidtrans(accessToken);
  }

  @Post('public/orders/:accessToken/payments/simulate-success')
  simulateSuccess(@Param('accessToken') accessToken: string) {
    return this.paymentsService.simulateLocalSandboxSuccess(accessToken);
  }

  @Post('webhooks/midtrans')
  midtransWebhook(@Body() payload: MidtransWebhookPayload) {
    return this.paymentsService.handleMidtransWebhook(payload);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER)
  @Post('staff/orders/:id/payments/cash')
  recordCash(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: RecordCashPaymentDto,
  ) {
    return this.paymentsService.recordCashPayment(user.branchId, user.id, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.CASHIER)
  @Get('staff/payments')
  listPayments(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: string,
    @Query('date') date?: string,
    @Query('q') q?: string,
  ) {
    return this.paymentsService.listPayments(user.branchId, {
      status,
      method,
      date,
      q: q?.trim() || undefined,
    });
  }
}
