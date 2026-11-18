import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QrStatus, Role, StaffRequestType, TableStatus } from '@prisma/client';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import * as QRCode from 'qrcode';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { generateSecureToken } from '../common/utils/token.util.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export class CreateTableDto {
  @IsString()
  @IsNotEmpty()
  code!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  capacity?: number;
}

export class UpdateTableDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  code?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  area?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(24)
  capacity?: number;

  @IsOptional()
  @IsEnum(TableStatus)
  status?: TableStatus;
}

export class UpdateQrStatusDto {
  @IsEnum(QrStatus)
  status!: QrStatus;
}

export class CreateStaffRequestDto {
  @IsEnum(StaffRequestType)
  type!: StaffRequestType;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CloseSessionDto {
  @IsOptional()
  @IsString()
  overrideReason?: string;
}

@Injectable()
export class TablesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly auditLogs: AuditLogsService,
    private readonly notifications: NotificationsService,
  ) {}

  async validateQrToken(token: string) {
    const qr = await this.prisma.tableQrCode.findUnique({
      where: { token },
      include: {
        table: {
          include: {
            branch: {
              select: {
                id: true,
                name: true,
                slug: true,
                address: true,
                phone: true,
                openHours: true,
                isOpen: true,
                taxRatePercent: true,
                serviceChargePercent: true,
                allowPayAtCashier: true,
                currency: true,
              },
            },
            tableSessions: {
              where: { status: 'OPEN' },
              orderBy: { openedAt: 'desc' },
              take: 1,
              include: {
                orders: {
                  orderBy: { createdAt: 'desc' },
                  select: {
                    id: true,
                    orderNumber: true,
                    accessToken: true,
                    status: true,
                    totalAmount: true,
                    createdAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!qr) {
      throw new NotFoundException('QR code meja tidak ditemukan atau tidak valid.');
    }

    if (qr.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'QR code meja ini sedang dinonaktifkan. Silakan hubungi staf kasir atau waiter kami.',
      );
    }

    if (qr.table.status === 'MAINTENANCE') {
      throw new ForbiddenException(
        `${qr.table.name} sedang tidak tersedia untuk pemesanan saat ini.`,
      );
    }

    if (!qr.table.branch.isOpen) {
      throw new ForbiddenException(
        'Outlet RANUM Coffee sedang tutup. Pemesanan QR tidak dapat dilakukan saat ini.',
      );
    }

    const activeSession = qr.table.tableSessions[0] ?? null;

    return {
      table: {
        id: qr.table.id,
        code: qr.table.code,
        name: qr.table.name,
        area: qr.table.area,
        capacity: qr.table.capacity,
        status: qr.table.status,
      },
      branch: qr.table.branch,
      activeSession: activeSession
        ? {
            id: activeSession.id,
            status: activeSession.status,
            openedAt: activeSession.openedAt,
            orders: activeSession.orders,
          }
        : null,
    };
  }

  async createCustomerStaffRequest(token: string, dto: CreateStaffRequestDto) {
    const validated = await this.validateQrToken(token);

    const session = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.tableSession.findFirst({
        where: { tableId: validated.table.id, status: 'OPEN' },
      });
      if (existing) return existing;
      return tx.tableSession.create({
        data: {
          branchId: validated.branch.id,
          tableId: validated.table.id,
          status: 'OPEN',
        },
      });
    });

    const request = await this.prisma.staffRequest.create({
      data: {
        branchId: validated.branch.id,
        tableSessionId: session.id,
        tableId: validated.table.id,
        type: dto.type,
        note: dto.note?.trim() || null,
      },
      include: {
        table: { select: { id: true, code: true, name: true, area: true } },
      },
    });

    this.notifications.emitStaffEvent(validated.branch.id, 'STAFF_REQUEST_CREATED', {
      request,
    });

    return request;
  }

  async listStaffTables(branchId: string) {
    return this.prisma.diningTable.findMany({
      where: { branchId },
      include: {
        qrCodes: {
          where: { status: { in: ['ACTIVE', 'DISABLED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tableSessions: {
          where: { status: 'OPEN' },
          orderBy: { openedAt: 'desc' },
          take: 1,
          include: {
            orders: {
              select: {
                id: true,
                orderNumber: true,
                status: true,
                totalAmount: true,
                payments: { select: { status: true } },
              },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async createTable(branchId: string, actorId: string, dto: CreateTableDto) {
    const code = dto.code.trim().toUpperCase();
    const existing = await this.prisma.diningTable.findUnique({
      where: { branchId_code: { branchId, code } },
    });
    if (existing) {
      throw new ConflictException(`Kode meja ${code} sudah digunakan.`);
    }

    const token = generateSecureToken(20);
    const table = await this.prisma.diningTable.create({
      data: {
        branchId,
        code,
        name: dto.name.trim(),
        area: dto.area?.trim() || 'Indoor',
        capacity: dto.capacity ?? 4,
        qrCodes: {
          create: {
            token,
            status: 'ACTIVE',
          },
        },
      },
      include: { qrCodes: true },
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'TABLE_CREATED',
      entityType: 'DiningTable',
      entityId: table.id,
      metadata: { code: table.code, name: table.name },
    });

    return table;
  }

  async updateTable(branchId: string, actorId: string, tableId: string, dto: UpdateTableDto) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, branchId } });
    if (!table) {
      throw new NotFoundException('Meja tidak ditemukan.');
    }

    const updated = await this.prisma.diningTable.update({
      where: { id: tableId },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim().toUpperCase() } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.area !== undefined ? { area: dto.area.trim() } : {}),
        ...(dto.capacity !== undefined ? { capacity: dto.capacity } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: { qrCodes: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'TABLE_UPDATED',
      entityType: 'DiningTable',
      entityId: tableId,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }

  async regenerateQr(branchId: string, actorId: string, tableId: string) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, branchId } });
    if (!table) {
      throw new NotFoundException('Meja tidak ditemukan.');
    }

    const newToken = generateSecureToken(20);
    const createdQr = await this.prisma.$transaction(async (tx) => {
      await tx.tableQrCode.updateMany({
        where: { tableId, status: { in: ['ACTIVE', 'DISABLED'] } },
        data: { status: 'REVOKED' },
      });

      return tx.tableQrCode.create({
        data: {
          tableId,
          token: newToken,
          status: 'ACTIVE',
          regeneratedAt: new Date(),
        },
      });
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'QR_REGENERATED',
      entityType: 'DiningTable',
      entityId: tableId,
      metadata: { qrCodeId: createdQr.id },
    });

    return createdQr;
  }

  async updateQrStatus(
    branchId: string,
    actorId: string,
    tableId: string,
    dto: UpdateQrStatusDto,
  ) {
    const table = await this.prisma.diningTable.findFirst({ where: { id: tableId, branchId } });
    if (!table) {
      throw new NotFoundException('Meja tidak ditemukan.');
    }

    const latestQr = await this.prisma.tableQrCode.findFirst({
      where: { tableId, status: { in: ['ACTIVE', 'DISABLED'] } },
      orderBy: { createdAt: 'desc' },
    });

    if (!latestQr) {
      throw new NotFoundException('QR aktif tidak ditemukan untuk meja ini.');
    }

    const updated = await this.prisma.tableQrCode.update({
      where: { id: latestQr.id },
      data: { status: dto.status },
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'QR_STATUS_UPDATED',
      entityType: 'TableQrCode',
      entityId: latestQr.id,
      metadata: { status: dto.status },
    });

    return updated;
  }

  async getQrImage(branchId: string, tableId: string) {
    const table = await this.prisma.diningTable.findFirst({
      where: { id: tableId, branchId },
      include: {
        qrCodes: {
          where: { status: { in: ['ACTIVE', 'DISABLED'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!table || table.qrCodes.length === 0) {
      throw new NotFoundException('QR meja tidak ditemukan.');
    }

    const qr = table.qrCodes[0];
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://127.0.0.1:8000';
    const targetUrl = `${frontendUrl.replace(/\/$/, '')}/t/${qr.token}`;

    const dataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 360,
      color: {
        dark: '#100F0D',
        light: '#FFFFFF',
      },
    });

    return {
      tableId: table.id,
      tableName: table.name,
      tableCode: table.code,
      area: table.area,
      qrStatus: qr.status,
      targetUrl,
      dataUrl,
    };
  }

  async closeTableSession(
    branchId: string,
    actorId: string,
    actorRole: Role,
    sessionId: string,
    dto: CloseSessionDto,
  ) {
    const session = await this.prisma.tableSession.findFirst({
      where: { id: sessionId, branchId },
      include: {
        orders: {
          include: {
            payments: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Sesi meja tidak ditemukan.');
    }
    if (session.status === 'CLOSED') {
      return session;
    }

    const blockingOrders = session.orders.filter((order) => {
      if (order.status === 'CANCELLED') return false;
      const isOrderDone = order.status === 'COMPLETED' || order.status === 'SERVED';
      const isPaid = order.payments.some((p) => p.status === 'PAID');
      return !isOrderDone || !isPaid;
    });

    if (blockingOrders.length > 0) {
      const hasOverride = actorRole === Role.ADMIN && Boolean(dto.overrideReason?.trim());
      if (!hasOverride) {
        throw new BadRequestException(
          `Sesi meja masih memiliki ${blockingOrders.length} pesanan yang belum selesai atau belum lunas.`,
        );
      }
    }

    const closed = await this.prisma.$transaction(async (tx) => {
      const updatedSession = await tx.tableSession.update({
        where: { id: sessionId },
        data: {
          status: 'CLOSED',
          closedAt: new Date(),
          closedById: actorId,
          overrideReason: dto.overrideReason?.trim() || null,
        },
      });

      await tx.diningTable.update({
        where: { id: session.tableId },
        data: { status: 'AVAILABLE' },
      });

      return updatedSession;
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: dto.overrideReason ? 'TABLE_SESSION_CLOSED_OVERRIDE' : 'TABLE_SESSION_CLOSED',
      entityType: 'TableSession',
      entityId: sessionId,
      metadata: {
        tableId: session.tableId,
        overrideReason: dto.overrideReason ?? null,
      },
    });

    return closed;
  }
}
