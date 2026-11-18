import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export class CreateSnapPaymentDto {
  @IsOptional()
  @IsBoolean()
  forceNew?: boolean;
}

export class RecordCashPaymentDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsString()
  method?: string;
}

export interface MidtransWebhookPayload {
  order_id: string;
  status_code: string;
  gross_amount: string;
  signature_key: string;
  transaction_status: string;
  transaction_id?: string;
  payment_type?: string;
  fraud_status?: string;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  private getMidtransConfig() {
    const isProduction = this.configService.get<string>('MIDTRANS_IS_PRODUCTION') === 'true';
    const serverKey = this.configService.get<string>('MIDTRANS_SERVER_KEY')?.trim() ?? '';
    const clientKey = this.configService.get<string>('MIDTRANS_CLIENT_KEY')?.trim() ?? '';
    const snapBaseUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    const apiBaseUrl = isProduction
      ? 'https://api.midtrans.com/v2'
      : 'https://api.sandbox.midtrans.com/v2';

    return { isProduction, serverKey, clientKey, snapBaseUrl, apiBaseUrl };
  }

  async createSnapAttempt(accessToken: string, dto: CreateSnapPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { accessToken },
      include: {
        branch: true,
        table: true,
        items: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan.');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Pesanan yang sudah dibatalkan tidak dapat dibayar.');
    }

    const alreadyPaid = order.payments.find((p) => p.status === PaymentStatus.PAID);
    if (alreadyPaid) {
      return {
        alreadyPaid: true,
        payment: alreadyPaid,
      };
    }

    if (!dto.forceNew) {
      const existingPending = order.payments.find(
        (p) =>
          p.provider === PaymentProvider.MIDTRANS_SNAP &&
          (p.status === PaymentStatus.CREATED || p.status === PaymentStatus.PENDING) &&
          p.snapToken &&
          (!p.expiredAt || p.expiredAt > new Date()),
      );
      if (existingPending) {
        const { clientKey, isProduction } = this.getMidtransConfig();
        return {
          payment: existingPending,
          snapToken: existingPending.snapToken,
          snapRedirectUrl: existingPending.snapRedirectUrl,
          clientKey,
          isProduction,
          sandboxSimulator: !this.getMidtransConfig().serverKey,
        };
      }
    }

    // Expire previous open attempts before creating a fresh payment attempt
    await this.prisma.payment.updateMany({
      where: {
        orderId: order.id,
        status: { in: [PaymentStatus.CREATED, PaymentStatus.PENDING] },
      },
      data: { status: PaymentStatus.EXPIRED },
    });

    const attemptSuffix = randomBytes(3).toString('hex').toUpperCase();
    const midtransOrderId = `${order.orderNumber}-${attemptSuffix}`;
    const expiredAt = new Date(Date.now() + 15 * 60 * 1000);

    const { serverKey, clientKey, isProduction, snapBaseUrl } = this.getMidtransConfig();

    let snapToken: string;
    let snapRedirectUrl: string | null = null;
    let sandboxSimulator = false;

    if (!serverKey) {
      // Local dev fallback when Midtrans merchant credentials are not yet set in .env
      sandboxSimulator = true;
      snapToken = `SIM-SNAP-${randomBytes(8).toString('hex')}`;
    } else {
      const authHeader = Buffer.from(`${serverKey}:`).toString('base64');
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://127.0.0.1:8000';
      const trackingUrl = `${frontendUrl.replace(/\/$/, '')}/order/${order.accessToken}`;

      const payload = {
        transaction_details: {
          order_id: midtransOrderId,
          gross_amount: order.totalAmount,
        },
        item_details: [
          ...order.items.map((item) => ({
            id: item.id,
            price: item.unitFinalPrice,
            quantity: item.quantity,
            name: item.productName.slice(0, 50),
          })),
          ...(order.serviceChargeAmount > 0
            ? [
                {
                  id: 'SERVICE_CHARGE',
                  price: order.serviceChargeAmount,
                  quantity: 1,
                  name: 'Service Charge',
                },
              ]
            : []),
          ...(order.taxAmount > 0
            ? [
                {
                  id: 'TAX',
                  price: order.taxAmount,
                  quantity: 1,
                  name: 'PB1 / Pajak Restoran',
                },
              ]
            : []),
        ],
        customer_details: {
          first_name: order.customerName || `Tamu ${order.table.name}`,
        },
        callbacks: {
          finish: trackingUrl,
        },
        expiry: {
          unit: 'minutes',
          duration: 15,
        },
      };

      const res = await fetch(snapBaseUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${authHeader}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new BadRequestException(`Gagal membuat transaksi Midtrans Snap: ${errBody}`);
      }

      const data = (await res.json()) as { token: string; redirect_url?: string };
      snapToken = data.token;
      snapRedirectUrl = data.redirect_url ?? null;
    }

    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: PaymentProvider.MIDTRANS_SNAP,
        amount: order.totalAmount,
        status: PaymentStatus.CREATED,
        midtransOrderId,
        snapToken,
        snapRedirectUrl,
        expiredAt,
      },
    });

    return {
      payment,
      snapToken,
      snapRedirectUrl,
      clientKey,
      isProduction,
      sandboxSimulator,
    };
  }

  async handleMidtransWebhook(payload: MidtransWebhookPayload) {
    const { serverKey } = this.getMidtransConfig();

    const rawSignatureInput = `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`;
    const expectedSignature = createHash('sha512').update(rawSignatureInput).digest('hex');
    const signatureValid = serverKey ? expectedSignature === payload.signature_key : false;

    if (serverKey && !signatureValid) {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          midtransOrderId: payload.order_id,
          transactionStatus: payload.transaction_status,
          statusCode: payload.status_code,
          grossAmount: payload.gross_amount,
          signatureValid: false,
          idempotencyKey: `INVALID-${payload.order_id}-${Date.now()}-${randomBytes(4).toString('hex')}`,
          payloadJson: JSON.stringify(this.redactWebhookPayload(payload)),
        },
      });
      throw new ForbiddenException('Signature webhook Midtrans tidak valid.');
    }

    return this.applyMidtransTransactionResult(payload, signatureValid);
  }

  async simulateLocalSandboxSuccess(accessToken: string) {
    const { serverKey } = this.getMidtransConfig();
    if (serverKey) {
      throw new ForbiddenException('Simulasi lokal hanya tersedia saat Midtrans Server Key belum dikonfigurasi.');
    }

    const order = await this.prisma.order.findUnique({
      where: { accessToken },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order || order.payments.length === 0) {
      throw new NotFoundException('Payment attempt tidak ditemukan.');
    }

    const payment = order.payments[0];
    if (!payment.midtransOrderId) {
      throw new BadRequestException('Midtrans order ID tidak tersedia.');
    }

    return this.applyMidtransTransactionResult(
      {
        order_id: payment.midtransOrderId,
        status_code: '200',
        gross_amount: `${payment.amount}.00`,
        signature_key: 'LOCAL_SANDBOX_SIMULATION',
        transaction_status: 'settlement',
        transaction_id: `SIM-TX-${randomBytes(4).toString('hex').toUpperCase()}`,
        payment_type: 'qris',
        fraud_status: 'accept',
      },
      true,
    );
  }

  async syncPaymentStatusFromMidtrans(accessToken: string) {
    const order = await this.prisma.order.findUnique({
      where: { accessToken },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order || order.payments.length === 0) {
      throw new NotFoundException('Pembayaran tidak ditemukan.');
    }

    const payment = order.payments[0];
    const { serverKey, apiBaseUrl } = this.getMidtransConfig();
    if (!serverKey || !payment.midtransOrderId) {
      return { payment, synced: false };
    }

    const authHeader = Buffer.from(`${serverKey}:`).toString('base64');
    const res = await fetch(`${apiBaseUrl}/${encodeURIComponent(payment.midtransOrderId)}/status`, {
      headers: {
        Accept: 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
    });

    if (!res.ok) {
      return { payment, synced: false };
    }

    const data = (await res.json()) as MidtransWebhookPayload;
    const result = await this.applyMidtransTransactionResult(data, true);
    return { ...result, synced: true };
  }

  async recordCashPayment(
    branchId: string,
    actorId: string,
    orderId: string,
    dto: RecordCashPaymentDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId },
      include: { payments: true },
    });
    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan.');
    }
    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Pesanan yang dibatalkan tidak dapat dibayar.');
    }

    const existingPaid = order.payments.find((p) => p.status === PaymentStatus.PAID);
    if (existingPaid) {
      return existingPaid;
    }

    const paidAmount = dto.amount ?? order.totalAmount;
    if (paidAmount < order.totalAmount) {
      throw new BadRequestException('Nominal pembayaran tunai kurang dari total pesanan.');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: order.id,
          provider: PaymentProvider.CASHIER_MANUAL,
          method: dto.method?.trim() || 'cash',
          amount: order.totalAmount,
          status: PaymentStatus.PAID,
          paidAt: new Date(),
          receivedById: actorId,
        },
      });

      if (order.status === OrderStatus.AWAITING_PAYMENT) {
        await tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.PENDING },
        });
        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            fromStatus: OrderStatus.AWAITING_PAYMENT,
            toStatus: OrderStatus.PENDING,
            changedById: actorId,
            note: 'Pembayaran tunai diterima kasir',
          },
        });
      }

      return payment;
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'CASH_PAYMENT_RECORDED',
      entityType: 'Payment',
      entityId: result.id,
      metadata: { orderId: order.id, orderNumber: order.orderNumber, amount: result.amount },
    });

    this.notifications.emitStaffEvent(branchId, 'PAYMENT_UPDATED', {
      orderId: order.id,
      payment: result,
    });
    this.notifications.emitOrderEvent(order.accessToken, 'PAYMENT_UPDATED', {
      payment: result,
    });

    return result;
  }

  async listPayments(
    branchId: string,
    filters: { status?: PaymentStatus; method?: string; date?: string; q?: string },
  ) {
    const where: Prisma.PaymentWhereInput = {
      order: { branchId },
    };

    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;
    if (filters.q) {
      where.OR = [
        { midtransOrderId: { contains: filters.q } },
        { midtransTransactionId: { contains: filters.q } },
        { order: { orderNumber: { contains: filters.q } } },
      ];
    }
    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00.000Z`);
      const end = new Date(`${filters.date}T23:59:59.999Z`);
      if (!Number.isNaN(start.getTime())) {
        where.createdAt = { gte: start, lte: end };
      }
    }

    return this.prisma.payment.findMany({
      where,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            table: { select: { name: true, code: true } },
          },
        },
        receivedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  private async applyMidtransTransactionResult(
    payload: MidtransWebhookPayload,
    signatureValid: boolean,
  ) {
    const idempotencyKey = `${payload.order_id}:${payload.transaction_status}:${payload.status_code}:${payload.transaction_id ?? 'none'}`;

    const existingEvent = await this.prisma.paymentWebhookEvent.findUnique({
      where: { idempotencyKey },
    });
    if (existingEvent) {
      return { status: 'already_processed', idempotencyKey };
    }

    const payment = await this.prisma.payment.findUnique({
      where: { midtransOrderId: payload.order_id },
      include: {
        order: {
          include: {
            branch: true,
            table: { select: { id: true, code: true, name: true, area: true } },
            items: { include: { options: true } },
          },
        },
      },
    });

    if (!payment) {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          midtransOrderId: payload.order_id,
          transactionStatus: payload.transaction_status,
          statusCode: payload.status_code,
          grossAmount: payload.gross_amount,
          signatureValid,
          idempotencyKey,
          payloadJson: JSON.stringify(this.redactWebhookPayload(payload)),
        },
      });
      throw new NotFoundException(`Payment dengan Midtrans order_id ${payload.order_id} tidak ditemukan.`);
    }

    const parsedGrossAmount = Math.round(Number(payload.gross_amount));
    if (Number.isNaN(parsedGrossAmount) || parsedGrossAmount !== payment.amount) {
      await this.prisma.paymentWebhookEvent.create({
        data: {
          paymentId: payment.id,
          midtransOrderId: payload.order_id,
          transactionStatus: payload.transaction_status,
          statusCode: payload.status_code,
          grossAmount: payload.gross_amount,
          signatureValid,
          idempotencyKey: `MISMATCH-${idempotencyKey}`,
          payloadJson: JSON.stringify(this.redactWebhookPayload(payload)),
        },
      });
      throw new BadRequestException('Nominal pembayaran Midtrans tidak sesuai dengan tagihan order.');
    }

    let nextPaymentStatus: PaymentStatus = payment.status;
    if (
      payload.transaction_status === 'settlement' ||
      (payload.transaction_status === 'capture' &&
        (!payload.fraud_status || payload.fraud_status === 'accept'))
    ) {
      nextPaymentStatus = PaymentStatus.PAID;
    } else if (payload.transaction_status === 'pending') {
      nextPaymentStatus = PaymentStatus.PENDING;
    } else if (payload.transaction_status === 'expire') {
      nextPaymentStatus = PaymentStatus.EXPIRED;
    } else if (payload.transaction_status === 'cancel') {
      nextPaymentStatus = PaymentStatus.CANCELLED;
    } else if (payload.transaction_status === 'deny') {
      nextPaymentStatus = PaymentStatus.FAILED;
    } else if (payload.transaction_status === 'refund') {
      nextPaymentStatus = PaymentStatus.REFUNDED;
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.paymentWebhookEvent.create({
        data: {
          paymentId: payment.id,
          midtransOrderId: payload.order_id,
          transactionStatus: payload.transaction_status,
          statusCode: payload.status_code,
          grossAmount: payload.gross_amount,
          signatureValid,
          idempotencyKey,
          payloadJson: JSON.stringify(this.redactWebhookPayload(payload)),
        },
      });

      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextPaymentStatus,
          method: payload.payment_type ?? payment.method,
          midtransTransactionId: payload.transaction_id ?? payment.midtransTransactionId,
          fraudStatus: payload.fraud_status ?? payment.fraudStatus,
          ...(nextPaymentStatus === PaymentStatus.PAID && !payment.paidAt
            ? { paidAt: new Date() }
            : {}),
        },
      });

      let updatedOrder = payment.order;
      if (
        nextPaymentStatus === PaymentStatus.PAID &&
        payment.order.status === OrderStatus.AWAITING_PAYMENT
      ) {
        const targetOrderStatus = payment.order.branch.requireCashierConfirm
          ? OrderStatus.PENDING
          : OrderStatus.CONFIRMED;

        updatedOrder = await tx.order.update({
          where: { id: payment.order.id },
          data: { status: targetOrderStatus },
          include: {
            branch: true,
            table: { select: { id: true, code: true, name: true, area: true } },
            items: { include: { options: true } },
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: payment.order.id,
            fromStatus: OrderStatus.AWAITING_PAYMENT,
            toStatus: targetOrderStatus,
            note: `Pembayaran online terverifikasi (${payload.payment_type ?? 'Midtrans'})`,
          },
        });
      }

      return { updatedPayment, updatedOrder };
    });

    if (nextPaymentStatus === PaymentStatus.PAID) {
      this.notifications.emitStaffEvent(payment.order.branchId, 'ORDER_CREATED', {
        order: result.updatedOrder,
      });
    } else {
      this.notifications.emitStaffEvent(payment.order.branchId, 'PAYMENT_UPDATED', {
        orderId: payment.order.id,
        payment: result.updatedPayment,
      });
    }

    this.notifications.emitOrderEvent(payment.order.accessToken, 'PAYMENT_UPDATED', {
      payment: result.updatedPayment,
      orderStatus: result.updatedOrder.status,
    });

    return {
      status: 'processed',
      payment: result.updatedPayment,
      orderStatus: result.updatedOrder.status,
    };
  }

  private redactWebhookPayload(payload: MidtransWebhookPayload) {
    return {
      order_id: payload.order_id,
      status_code: payload.status_code,
      gross_amount: payload.gross_amount,
      transaction_status: payload.transaction_status,
      transaction_id: payload.transaction_id,
      payment_type: payload.payment_type,
      fraud_status: payload.fraud_status,
    };
  }
}
