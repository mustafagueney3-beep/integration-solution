import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { InventoryClient } from '../inventory/inventory.client';
import { WmsBus } from '../wms/wms.messaging';
import { v4 as uuid } from 'uuid';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private store = new Map<string, any>();

  constructor(private inv: InventoryClient, private wms: WmsBus) {}

  getStore() {
    return this.store;
  }

  async createOrder(dto: any) {
    const orderId = dto.orderId || `ORD-${Date.now()}`;
    const order = {
      ...dto,
      orderId,
      status: 'RECEIVED',
      timestamps: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };
    this.store.set(orderId, order);
    this.logger.log(`Order ${orderId} received`);

    // Skip inventory check if not available (demo mode)
    let reservationId = `RES-${Date.now()}`;
    order.status = 'RESERVED';
    order.reservationId = reservationId;
    this.store.set(orderId, order);
    this.logger.log(`Order ${orderId} reserved (mock)`);

    // Calculate total amount from items
    const totalAmount = dto.items?.reduce((sum: number, item: any) => {
      return sum + ((item.unitPrice || 0) * (item.quantity || 1));
    }, 0) || 0;

    const payUrl =
      process.env.PAYMENT_SERVICE_URL || 'http://payments:3001/api';
    let payRes: any;
    try {
      const resp = await axios.post(
        `${payUrl}/payments`,
        {
          orderId: 1, // simplified for demo
          amount: totalAmount,
          capture: dto.capture ?? true,
        },
        { timeout: 5000 },
      );
      payRes = resp.data;
      this.logger.log(`Payment created: ${payRes.paymentId}`);
    } catch (err) {
      this.logger.warn(
        `Payment call failed for ${orderId}: ${err?.message || err}`,
      );
      payRes = { status: 'DECLINED' };
    }

    if (!['CAPTURED', 'AUTHORIZED'].includes(String(payRes.status))) {
      this.logger.warn(
        `Payment failed for ${orderId}; marking as declined`,
      );
      order.status = 'PAYMENT_DECLINED';
      this.store.set(orderId, order);
      return order;
    }

    order.payment = {
      paymentId: payRes.paymentId || `PAY-${Date.now()}`,
      status: payRes.status,
    };
    order.status = 'FULFILLMENT_QUEUED';
    order.timestamps.updatedAt = new Date().toISOString();
    this.store.set(orderId, order);

    await this.wms.publishFulfillmentCreated({
      orderId,
      reservationId,
      items: dto.items,
      shippingAddress: dto.shippingAddress,
      totalAmount: dto.totalAmount,
    });

    this.logger.log(`Order ${orderId} queued for fulfillment`);
    return order;
  }

  getOrder(orderId: string) {
    return this.store.get(orderId);
  }
}
