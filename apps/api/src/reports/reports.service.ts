import { Injectable } from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(branchId: string, from?: string, to?: string) {
    const createdAtFilter: { gte?: Date; lte?: Date } = {};
    if (from) {
      const start = new Date(`${from}T00:00:00.000Z`);
      if (!Number.isNaN(start.getTime())) createdAtFilter.gte = start;
    }
    if (to) {
      const end = new Date(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(end.getTime())) createdAtFilter.lte = end;
    }

    const whereOrder = {
      branchId,
      ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
    };

    const orders = await this.prisma.order.findMany({
      where: whereOrder,
      include: {
        items: true,
        payments: { where: { status: PaymentStatus.PAID } },
      },
    });

    const totalOrders = orders.length;
    const paidOrders = orders.filter((o) => o.payments.length > 0 && o.status !== OrderStatus.CANCELLED);
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    const statusCounts: Record<string, number> = {};
    for (const order of orders) {
      statusCounts[order.status] = (statusCounts[order.status] ?? 0) + 1;
    }

    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const order of paidOrders) {
      for (const item of order.items) {
        const current = productMap.get(item.productName) ?? {
          name: item.productName,
          quantity: 0,
          revenue: 0,
        };
        current.quantity += item.quantity;
        current.revenue += item.lineTotal;
        productMap.set(item.productName, current);
      }
    }

    const topProducts = [...productMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    return {
      totalOrders,
      paidOrdersCount: paidOrders.length,
      totalRevenue,
      statusCounts,
      topProducts,
    };
  }

  async exportTransactionsCsv(branchId: string, from?: string, to?: string): Promise<string> {
    const createdAtFilter: { gte?: Date; lte?: Date } = {};
    if (from) {
      const start = new Date(`${from}T00:00:00.000Z`);
      if (!Number.isNaN(start.getTime())) createdAtFilter.gte = start;
    }
    if (to) {
      const end = new Date(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(end.getTime())) createdAtFilter.lte = end;
    }

    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        ...(Object.keys(createdAtFilter).length > 0 ? { createdAt: createdAtFilter } : {}),
      },
      include: {
        table: { select: { name: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    const header = [
      'Order Number',
      'Tanggal',
      'Meja',
      'Status Order',
      'Metode Pembayaran',
      'Status Pembayaran',
      'Subtotal',
      'Service Charge',
      'Pajak',
      'Total',
      'Midtrans Order ID',
    ].join(',');

    const rows = orders.map((o) => {
      const p = o.payments[0];
      return [
        o.orderNumber,
        o.createdAt.toISOString(),
        `"${o.table.name}"`,
        o.status,
        p?.method ?? o.paymentPolicy,
        p?.status ?? 'UNPAID',
        o.subtotal,
        o.serviceChargeAmount,
        o.taxAmount,
        o.totalAmount,
        p?.midtransOrderId ?? '',
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  async getRevenueTimeseries(branchId: string, period: 'day' | 'month' | 'year' = 'day') {
    const now = new Date();
    const startDate = new Date(now);

    if (period === 'day') {
      startDate.setDate(now.getDate() - 13);
      startDate.setHours(0, 0, 0, 0);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 11, 1);
      startDate.setHours(0, 0, 0, 0);
    } else {
      startDate.setFullYear(now.getFullYear() - 4, 0, 1);
      startDate.setHours(0, 0, 0, 0);
    }

    const orders = await this.prisma.order.findMany({
      where: {
        branchId,
        status: { not: OrderStatus.CANCELLED },
        createdAt: { gte: startDate },
        payments: { some: { status: PaymentStatus.PAID } },
      },
      select: {
        totalAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    const buckets = new Map<string, { label: string; revenue: number; ordersCount: number }>();

    if (period === 'day') {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        buckets.set(key, { label, revenue: 0, ordersCount: 0 });
      }
      for (const o of orders) {
        const key = o.createdAt.toISOString().slice(0, 10);
        const b = buckets.get(key);
        if (b) {
          b.revenue += o.totalAmount;
          b.ordersCount += 1;
        }
      }
    } else if (period === 'month') {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
        buckets.set(key, { label, revenue: 0, ordersCount: 0 });
      }
      for (const o of orders) {
        const key = `${o.createdAt.getFullYear()}-${String(o.createdAt.getMonth() + 1).padStart(2, '0')}`;
        const b = buckets.get(key);
        if (b) {
          b.revenue += o.totalAmount;
          b.ordersCount += 1;
        }
      }
    } else {
      for (let i = 4; i >= 0; i--) {
        const y = now.getFullYear() - i;
        const key = String(y);
        buckets.set(key, { label: key, revenue: 0, ordersCount: 0 });
      }
      for (const o of orders) {
        const key = String(o.createdAt.getFullYear());
        const b = buckets.get(key);
        if (b) {
          b.revenue += o.totalAmount;
          b.ordersCount += 1;
        }
      }
    }

    return {
      period,
      series: [...buckets.values()],
    };
  }
}
