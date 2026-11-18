import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentPolicy, Prisma, Role } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { generateOrderNumber, generateSecureToken } from '../common/utils/token.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  optionValueIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  addonIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  qrToken!: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(PaymentPolicy)
  paymentPolicy?: PaymentPolicy;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  AWAITING_PAYMENT: [OrderStatus.CANCELLED],
  PENDING: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  PREPARING: [OrderStatus.READY],
  READY: [OrderStatus.SERVED],
  SERVED: [OrderStatus.COMPLETED],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  async createPublicOrder(dto: CreateOrderDto, headerIdempotencyKey?: string) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Keranjang pesanan tidak boleh kosong.');
    }

    const idempotencyKey = (headerIdempotencyKey || dto.idempotencyKey)?.trim() || null;
    if (idempotencyKey) {
      const existingOrder = await this.prisma.order.findUnique({
        where: { idempotencyKey },
        include: this.orderInclude(),
      });
      if (existingOrder) {
        return existingOrder;
      }
    }

    const qr = await this.prisma.tableQrCode.findUnique({
      where: { token: dto.qrToken },
      include: {
        table: {
          include: { branch: true },
        },
      },
    });

    if (!qr || qr.status !== 'ACTIVE') {
      throw new ForbiddenException('QR code meja tidak valid atau sedang dinonaktifkan.');
    }
    if (qr.table.status === 'MAINTENANCE') {
      throw new ForbiddenException(`${qr.table.name} sedang tidak tersedia untuk pemesanan.`);
    }
    if (!qr.table.branch.isOpen) {
      throw new ForbiddenException('Outlet sedang tutup. Pemesanan tidak dapat diproses.');
    }

    const branch = qr.table.branch;
    const requestedPolicy = dto.paymentPolicy ?? PaymentPolicy.ONLINE_MIDTRANS;
    if (requestedPolicy === PaymentPolicy.PAY_AT_CASHIER && !branch.allowPayAtCashier) {
      throw new BadRequestException('Opsi Bayar di Kasir saat ini tidak diaktifkan.');
    }

    // Load all requested products with their options & addons
    const productIds = [...new Set(dto.items.map((item) => item.productId))];
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds }, branchId: branch.id },
      include: {
        optionGroups: { include: { values: true } },
        addons: { where: { isActive: true } },
      },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    let subtotal = 0;
    const preparedItems: Array<{
      productId: string;
      productName: string;
      unitBasePrice: number;
      unitFinalPrice: number;
      quantity: number;
      lineTotal: number;
      notes: string | null;
      options: Array<{
        type: 'VARIANT' | 'ADDON';
        groupName: string;
        optionName: string;
        additionalPrice: number;
      }>;
    }> = [];

    for (const reqItem of dto.items) {
      const product = productMap.get(reqItem.productId);
      if (!product) {
        throw new BadRequestException('Salah satu produk tidak ditemukan.');
      }
      if (product.availability !== 'ACTIVE') {
        throw new BadRequestException(`Produk "${product.name}" sedang tidak tersedia atau habis.`);
      }

      const selectedValueIds = new Set(reqItem.optionValueIds ?? []);
      const selectedAddonIds = new Set(reqItem.addonIds ?? []);
      const snapshotOptions: Array<{
        type: 'VARIANT' | 'ADDON';
        groupName: string;
        optionName: string;
        additionalPrice: number;
      }> = [];

      let extraPerUnit = 0;

      for (const group of product.optionGroups) {
        const chosenInGroup = group.values.filter((v) => selectedValueIds.has(v.id));
        if (group.isRequired && chosenInGroup.length === 0) {
          throw new BadRequestException(
            `Pilihan "${group.name}" wajib dipilih untuk ${product.name}.`,
          );
        }
        if (!group.allowMultiple && chosenInGroup.length > 1) {
          throw new BadRequestException(
            `Hanya satu pilihan yang diperbolehkan untuk "${group.name}" pada ${product.name}.`,
          );
        }
        for (const val of chosenInGroup) {
          extraPerUnit += val.additionalPrice;
          snapshotOptions.push({
            type: 'VARIANT',
            groupName: group.name,
            optionName: val.name,
            additionalPrice: val.additionalPrice,
          });
        }
      }

      for (const addon of product.addons) {
        if (selectedAddonIds.has(addon.id)) {
          extraPerUnit += addon.price;
          snapshotOptions.push({
            type: 'ADDON',
            groupName: 'Add-on',
            optionName: addon.name,
            additionalPrice: addon.price,
          });
        }
      }

      const unitFinalPrice = product.basePrice + extraPerUnit;
      const lineTotal = unitFinalPrice * reqItem.quantity;
      subtotal += lineTotal;

      preparedItems.push({
        productId: product.id,
        productName: product.name,
        unitBasePrice: product.basePrice,
        unitFinalPrice,
        quantity: reqItem.quantity,
        lineTotal,
        notes: reqItem.notes?.trim() || null,
        options: snapshotOptions,
      });
    }

    const serviceChargeAmount = Math.round((subtotal * branch.serviceChargePercent) / 100);
    const taxAmount = Math.round(((subtotal + serviceChargeAmount) * branch.taxRatePercent) / 100);
    const totalAmount = subtotal + serviceChargeAmount + taxAmount;

    const initialStatus: OrderStatus =
      requestedPolicy === PaymentPolicy.PAY_AT_CASHIER
        ? OrderStatus.PENDING
        : OrderStatus.AWAITING_PAYMENT;

    const createdOrder = await this.prisma.$transaction(async (tx) => {
      // Ensure single open table session atomically
      let session = await tx.tableSession.findFirst({
        where: { tableId: qr.table.id, status: 'OPEN' },
      });
      if (!session) {
        session = await tx.tableSession.create({
          data: {
            branchId: branch.id,
            tableId: qr.table.id,
            status: 'OPEN',
          },
        });
      }

      await tx.diningTable.update({
        where: { id: qr.table.id },
        data: { status: 'OCCUPIED' },
      });

      const order = await tx.order.create({
        data: {
          branchId: branch.id,
          tableSessionId: session.id,
          tableId: qr.table.id,
          orderNumber: generateOrderNumber(),
          accessToken: generateSecureToken(20),
          customerName: dto.customerName?.trim() || null,
          notes: dto.notes?.trim() || null,
          status: initialStatus,
          paymentPolicy: requestedPolicy,
          subtotal,
          taxAmount,
          serviceChargeAmount,
          totalAmount,
          idempotencyKey,
          items: {
            create: preparedItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              unitBasePrice: item.unitBasePrice,
              unitFinalPrice: item.unitFinalPrice,
              quantity: item.quantity,
              lineTotal: item.lineTotal,
              notes: item.notes,
              options: {
                create: item.options,
              },
            })),
          },
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: initialStatus,
              note:
                requestedPolicy === PaymentPolicy.PAY_AT_CASHIER
                  ? 'Pesanan dibuat (Bayar di Kasir)'
                  : 'Pesanan dibuat, menunggu pembayaran online',
            },
          },
        },
        include: this.orderInclude(),
      });

      return order;
    });

    if (initialStatus === OrderStatus.PENDING) {
      this.notifications.emitStaffEvent(branch.id, 'ORDER_CREATED', {
        order: createdOrder,
      });
    }

    return createdOrder;
  }

  async getPublicOrder(accessToken: string) {
    const order = await this.prisma.order.findUnique({
      where: { accessToken },
      include: {
        table: { select: { id: true, code: true, name: true, area: true } },
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            allowPayAtCashier: true,
          },
        },
        items: { include: { options: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            provider: true,
            method: true,
            amount: true,
            status: true,
            midtransOrderId: true,
            snapToken: true,
            snapRedirectUrl: true,
            paidAt: true,
            expiredAt: true,
            createdAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan.');
    }

    return order;
  }

  async listStaffOrders(
    branchId: string,
    filters: { status?: OrderStatus; tableId?: string; q?: string; date?: string; limit?: number },
  ) {
    const where: Prisma.OrderWhereInput = { branchId };

    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.tableId) {
      where.tableId = filters.tableId;
    }
    if (filters.q) {
      where.OR = [
        { orderNumber: { contains: filters.q } },
        { customerName: { contains: filters.q } },
      ];
    }
    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00.000Z`);
      const end = new Date(`${filters.date}T23:59:59.999Z`);
      if (!Number.isNaN(start.getTime())) {
        where.createdAt = { gte: start, lte: end };
      }
    }

    return this.prisma.order.findMany({
      where,
      include: this.orderInclude(),
      orderBy: { createdAt: 'desc' },
      take: Math.min(filters.limit ?? 50, 200),
    });
  }

  async updateStaffOrderStatus(
    branchId: string,
    actorId: string,
    actorRole: Role,
    orderId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, branchId },
      include: { payments: true },
    });

    if (!order) {
      throw new NotFoundException('Pesanan tidak ditemukan.');
    }

    const allowedNext = ALLOWED_TRANSITIONS[order.status] ?? [];
    if (!allowedNext.includes(dto.status)) {
      throw new BadRequestException(
        `Transisi status dari ${order.status} ke ${dto.status} tidak diizinkan.`,
      );
    }

    this.assertRoleCanTransition(actorRole, order.status, dto.status);

    if (dto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.AWAITING_PAYMENT) {
      if (!dto.reason?.trim()) {
        throw new BadRequestException('Alasan pembatalan wajib diisi.');
      }
    }

    if (dto.status === OrderStatus.COMPLETED) {
      const isPaid = order.payments.some((p) => p.status === 'PAID');
      if (!isPaid) {
        throw new BadRequestException(
          'Pesanan belum dapat diselesaikan karena pembayaran belum lunas.',
        );
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const next = await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          ...(dto.status === OrderStatus.CONFIRMED ? { confirmedById: actorId } : {}),
          ...(dto.status === OrderStatus.CANCELLED
            ? { cancelledById: actorId, cancelReason: dto.reason?.trim() || 'Dibatalkan staf' }
            : {}),
        },
        include: this.orderInclude(),
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.status,
          toStatus: dto.status,
          changedById: actorId,
          note: dto.reason?.trim() || null,
        },
      });

      return next;
    });

    if (dto.status === OrderStatus.CANCELLED) {
      await this.auditLogs.log({
        branchId,
        actorId,
        action: 'ORDER_CANCELLED',
        entityType: 'Order',
        entityId: orderId,
        metadata: { orderNumber: order.orderNumber, reason: dto.reason ?? null },
      });
    }

    this.notifications.emitStaffEvent(branchId, 'ORDER_UPDATED', { order: updated });
    this.notifications.emitOrderEvent(updated.accessToken, 'ORDER_UPDATED', {
      status: updated.status,
      order: updated,
    });

    return updated;
  }

  private assertRoleCanTransition(role: Role, _from: OrderStatus, to: OrderStatus): void {
    if (role === Role.ADMIN) return;

    if (role === Role.CASHIER) {
      if (
        to === OrderStatus.CONFIRMED ||
        to === OrderStatus.CANCELLED ||
        to === OrderStatus.COMPLETED
      ) {
        return;
      }
    }

    if (role === Role.BARISTA) {
      if (to === OrderStatus.PREPARING || to === OrderStatus.READY) {
        return;
      }
    }

    if (role === Role.WAITER) {
      if (to === OrderStatus.SERVED) {
        return;
      }
    }

    throw new ForbiddenException(`Role ${role} tidak memiliki izin mengubah status ke ${to}.`);
  }

  private orderInclude() {
    return {
      table: { select: { id: true, code: true, name: true, area: true } },
      items: { include: { options: true } },
      statusHistory: {
        orderBy: { createdAt: 'asc' as const },
        include: { changedBy: { select: { id: true, name: true, role: true } } },
      },
      payments: { orderBy: { createdAt: 'desc' as const } },
    };
  }
}
