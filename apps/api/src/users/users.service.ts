import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { IsBoolean, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export class CreateStaffUserDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(Role)
  role!: Role;
}

export class UpdateStaffUserDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async list(branchId: string) {
    return this.prisma.user.findMany({
      where: { branchId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(branchId: string, actorId: string, dto: CreateStaffUserDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('Email staf sudah terdaftar.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const created = await this.prisma.user.create({
      data: {
        branchId,
        name: dto.name.trim(),
        email,
        passwordHash,
        role: dto.role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'STAFF_CREATED',
      entityType: 'User',
      entityId: created.id,
      metadata: { email: created.email, role: created.role },
    });

    return created;
  }

  async update(branchId: string, actorId: string, userId: string, dto: UpdateStaffUserDto) {
    const target = await this.prisma.user.findFirst({ where: { id: userId, branchId } });
    if (!target) {
      throw new NotFoundException('Akun staf tidak ditemukan.');
    }

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name.trim();
    if (dto.role !== undefined) data['role'] = dto.role;
    if (dto.isActive !== undefined) data['isActive'] = dto.isActive;
    if (dto.password !== undefined) data['passwordHash'] = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'STAFF_UPDATED',
      entityType: 'User',
      entityId: userId,
      metadata: { role: updated.role, isActive: updated.isActive },
    });

    return updated;
  }
}
