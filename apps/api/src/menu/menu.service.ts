import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ProductAvailability, ProductBadge } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

export class CreateCategoryDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class OptionValueInputDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  additionalPrice!: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export class OptionGroupInputDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsOptional()
  @IsBoolean()
  isRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  allowMultiple?: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionValueInputDto)
  values!: OptionValueInputDto[];
}

export class AddonInputDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  categoryId!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  slug!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsInt()
  @Min(0)
  basePrice!: number;

  @IsOptional()
  @IsEnum(ProductBadge)
  badge?: ProductBadge;

  @IsOptional()
  @IsEnum(ProductAvailability)
  availability?: ProductAvailability;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionGroupInputDto)
  optionGroups?: OptionGroupInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddonInputDto)
  addons?: AddonInputDto[];
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  basePrice?: number;

  @IsOptional()
  @IsEnum(ProductBadge)
  badge?: ProductBadge;

  @IsOptional()
  @IsEnum(ProductAvailability)
  availability?: ProductAvailability;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionGroupInputDto)
  optionGroups?: OptionGroupInputDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddonInputDto)
  addons?: AddonInputDto[];
}

@Injectable()
export class MenuService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async getPublicMenu(params: { q?: string; categorySlug?: string; featured?: boolean }) {
    const branch = await this.prisma.branch.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!branch) {
      return { categories: [], products: [] };
    }

    const categories = await this.prisma.category.findMany({
      where: { branchId: branch.id, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    const products = await this.prisma.product.findMany({
      where: {
        branchId: branch.id,
        availability: { in: ['ACTIVE', 'OUT_OF_STOCK'] },
        category: {
          isActive: true,
          ...(params.categorySlug ? { slug: params.categorySlug } : {}),
        },
        ...(params.featured ? { isFeatured: true } : {}),
        ...(params.q
          ? {
              OR: [
                { name: { contains: params.q } },
                { description: { contains: params.q } },
              ],
            }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        optionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: {
            values: { orderBy: { sortOrder: 'asc' } },
          },
        },
        addons: {
          where: { isActive: true },
        },
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return { categories, products };
  }

  async listStaffCategories(branchId: string) {
    return this.prisma.category.findMany({
      where: { branchId },
      include: { _count: { select: { products: true } } },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createCategory(branchId: string, actorId: string, dto: CreateCategoryDto) {
    const slug = dto.slug.trim().toLowerCase();
    const exists = await this.prisma.category.findUnique({
      where: { branchId_slug: { branchId, slug } },
    });
    if (exists) {
      throw new ConflictException(`Slug kategori "${slug}" sudah digunakan.`);
    }

    const created = await this.prisma.category.create({
      data: {
        branchId,
        name: dto.name.trim(),
        slug,
        sortOrder: dto.sortOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'CATEGORY_CREATED',
      entityType: 'Category',
      entityId: created.id,
      metadata: { name: created.name },
    });

    return created;
  }

  async updateCategory(branchId: string, actorId: string, id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findFirst({ where: { id, branchId } });
    if (!category) throw new NotFoundException('Kategori tidak ditemukan.');

    const updated = await this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'CATEGORY_UPDATED',
      entityType: 'Category',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return updated;
  }

  async listStaffProducts(branchId: string) {
    return this.prisma.product.findMany({
      where: { branchId },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        optionGroups: {
          orderBy: { sortOrder: 'asc' },
          include: { values: { orderBy: { sortOrder: 'asc' } } },
        },
        addons: true,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  async createProduct(branchId: string, actorId: string, dto: CreateProductDto) {
    const slug = dto.slug.trim().toLowerCase();
    const exists = await this.prisma.product.findUnique({
      where: { branchId_slug: { branchId, slug } },
    });
    if (exists) {
      throw new ConflictException(`Slug produk "${slug}" sudah digunakan.`);
    }

    const created = await this.prisma.product.create({
      data: {
        branchId,
        categoryId: dto.categoryId,
        name: dto.name.trim(),
        slug,
        description: dto.description.trim(),
        imageUrl: dto.imageUrl?.trim() || null,
        basePrice: dto.basePrice,
        badge: dto.badge ?? 'NONE',
        availability: dto.availability ?? 'ACTIVE',
        isFeatured: dto.isFeatured ?? false,
        optionGroups: dto.optionGroups
          ? {
              create: dto.optionGroups.map((group, gIdx) => ({
                name: group.name.trim(),
                isRequired: group.isRequired ?? false,
                allowMultiple: group.allowMultiple ?? false,
                sortOrder: gIdx,
                values: {
                  create: group.values.map((val, vIdx) => ({
                    name: val.name.trim(),
                    additionalPrice: val.additionalPrice,
                    isDefault: val.isDefault ?? false,
                    sortOrder: vIdx,
                  })),
                },
              })),
            }
          : undefined,
        addons: dto.addons
          ? {
              create: dto.addons.map((addon) => ({
                name: addon.name.trim(),
                price: addon.price,
                isActive: addon.isActive ?? true,
              })),
            }
          : undefined,
      },
      include: {
        category: true,
        optionGroups: { include: { values: true } },
        addons: true,
      },
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'PRODUCT_CREATED',
      entityType: 'Product',
      entityId: created.id,
      metadata: { name: created.name, basePrice: created.basePrice },
    });

    return created;
  }

  async updateProduct(branchId: string, actorId: string, id: string, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findFirst({ where: { id, branchId } });
    if (!existing) throw new NotFoundException('Produk tidak ditemukan.');

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.optionGroups !== undefined) {
        await tx.productOptionGroup.deleteMany({ where: { productId: id } });
      }
      if (dto.addons !== undefined) {
        await tx.productAddon.deleteMany({ where: { productId: id } });
      }

      return tx.product.update({
        where: { id },
        data: {
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.description !== undefined ? { description: dto.description.trim() } : {}),
          ...(dto.imageUrl !== undefined ? { imageUrl: dto.imageUrl?.trim() || null } : {}),
          ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
          ...(dto.badge !== undefined ? { badge: dto.badge } : {}),
          ...(dto.availability !== undefined ? { availability: dto.availability } : {}),
          ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
          ...(dto.optionGroups !== undefined
            ? {
                optionGroups: {
                  create: dto.optionGroups.map((group, gIdx) => ({
                    name: group.name.trim(),
                    isRequired: group.isRequired ?? false,
                    allowMultiple: group.allowMultiple ?? false,
                    sortOrder: gIdx,
                    values: {
                      create: group.values.map((val, vIdx) => ({
                        name: val.name.trim(),
                        additionalPrice: val.additionalPrice,
                        isDefault: val.isDefault ?? false,
                        sortOrder: vIdx,
                      })),
                    },
                  })),
                },
              }
            : {}),
          ...(dto.addons !== undefined
            ? {
                addons: {
                  create: dto.addons.map((addon) => ({
                    name: addon.name.trim(),
                    price: addon.price,
                    isActive: addon.isActive ?? true,
                  })),
                },
              }
            : {}),
        },
        include: {
          category: true,
          optionGroups: { include: { values: true } },
          addons: true,
        },
      });
    });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'PRODUCT_UPDATED',
      entityType: 'Product',
      entityId: id,
      metadata: {
        basePriceChanged: dto.basePrice !== undefined && dto.basePrice !== existing.basePrice,
        oldPrice: existing.basePrice,
        newPrice: dto.basePrice ?? existing.basePrice,
        availability: updated.availability,
      },
    });

    return updated;
  }

  async deleteProduct(branchId: string, actorId: string, id: string) {
    const existing = await this.prisma.product.findFirst({ where: { id, branchId } });
    if (!existing) throw new NotFoundException('Produk tidak ditemukan.');

    await this.prisma.product.delete({ where: { id } });

    await this.auditLogs.log({
      branchId,
      actorId,
      action: 'PRODUCT_DELETED',
      entityType: 'Product',
      entityId: id,
      metadata: { name: existing.name },
    });

    return { deleted: true };
  }
}
