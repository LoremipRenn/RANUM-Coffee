import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, filter, map } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service.js';

export interface RealtimeEvent {
  channel: 'staff' | 'order';
  branchId?: string;
  orderAccessToken?: string;
  type:
    | 'ORDER_CREATED'
    | 'ORDER_UPDATED'
    | 'PAYMENT_UPDATED'
    | 'STAFF_REQUEST_CREATED'
    | 'STAFF_REQUEST_RESOLVED';
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly events$ = new Subject<RealtimeEvent>();

  constructor(private readonly prisma: PrismaService) {}

  emitStaffEvent(branchId: string, type: RealtimeEvent['type'], payload: Record<string, unknown>): void {
    this.events$.next({ channel: 'staff', branchId, type, payload });
  }

  emitOrderEvent(
    orderAccessToken: string,
    type: 'ORDER_UPDATED' | 'PAYMENT_UPDATED',
    payload: Record<string, unknown>,
  ): void {
    this.events$.next({ channel: 'order', orderAccessToken, type, payload });
  }

  streamStaff(branchId: string): Observable<MessageEvent> {
    return this.events$.asObservable().pipe(
      filter((event) => event.channel === 'staff' && event.branchId === branchId),
      map((event) => ({
        type: event.type,
        data: event.payload,
      })),
    );
  }

  streamOrder(accessToken: string): Observable<MessageEvent> {
    return this.events$.asObservable().pipe(
      filter((event) => event.channel === 'order' && event.orderAccessToken === accessToken),
      map((event) => ({
        type: event.type,
        data: event.payload,
      })),
    );
  }

  async listOpenStaffRequests(branchId: string) {
    return this.prisma.staffRequest.findMany({
      where: { branchId, status: 'OPEN' },
      include: {
        table: { select: { id: true, code: true, name: true, area: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolveStaffRequest(branchId: string, requestId: string, userId: string) {
    const updated = await this.prisma.staffRequest.updateMany({
      where: { id: requestId, branchId, status: 'OPEN' },
      data: {
        status: 'RESOLVED',
        resolvedById: userId,
        resolvedAt: new Date(),
      },
    });
    if (updated.count > 0) {
      this.emitStaffEvent(branchId, 'STAFF_REQUEST_RESOLVED', { requestId });
    }
    return { resolved: updated.count > 0 };
  }
}
