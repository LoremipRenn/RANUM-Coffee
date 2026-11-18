import { Injectable, NotFoundException } from '@nestjs/common';
import { IsBoolean, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export class UpdateBranchSettingsDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  openHours?: string;

  @IsOptional()
  @IsBoolean()
  isOpen?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(30)
  taxRatePercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(20)
  serviceChargePercent?: number;

  @IsOptional()
  @IsBoolean()
  allowPayAtCashier?: boolean;

  @IsOptional()
  @IsBoolean()
  requireCashierConfirm?: boolean;
}

@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getPublicOutlet() {
    const branch = await this.prisma.branch.findFirst({
      orderBy: { createdAt: 'asc' },
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
    });
    if (!branch) {
      throw new NotFoundException('Konfigurasi outlet belum tersedia.');
    }
    return branch;
  }

  async getBranchById(branchId: string) {
    const branch = await this.prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      throw new NotFoundException('Outlet tidak ditemukan.');
    }
    return branch;
  }

  async updateSettings(branchId: string, actorId: string, dto: UpdateBranchSettingsDto) {
    const updated = await this.prisma.branch.update({
      where: { id: branchId },
      data: dto,
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'OUTLET_SETTINGS_UPDATED',
      entityType: 'Branch',
      entityId: branchId,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }
}
