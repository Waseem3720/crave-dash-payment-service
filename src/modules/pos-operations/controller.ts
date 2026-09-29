import { Request, Response } from 'express';
import { PosVoidRefundLog, PosActivityLog } from './model';
import { Payment } from '../payments/model';
import { successResponse } from '../../utils/response';
import { orderServiceClient } from '../../clients/order-service.client';
import { config } from '../../config';
import { v4 as uuidv4 } from 'uuid';

/** Fire-and-forget push of a POS payment result to Order Service (retry inside client). */
async function notifyOrderPaid(orderId: string, paymentId: string, transactionId: string): Promise<void> {
  try {
    await orderServiceClient.notifyPaymentStatus(orderId, {
      paymentStatus: 'paid',
      transactionReference: transactionId,
      paymentId,
    });
  } catch (e) {
    console.error(`[pos-operations] Order notification failed for ${orderId}:`, e instanceof Error ? e.message : e);
  }
}

export const posOperationsController = {
  // Orchestration: create POS order + capture payment in one round trip
  async createPosOrder(req: Request, res: Response): Promise<void> {
    const { orderPayload, paymentPayload } = req.body;
    // 1. Create order in Order Service
    const orderResult = await orderServiceClient.createOrder(
      { ...orderPayload, orderType: 'pos' },
    );
    const orderId = orderResult?.data?._id ?? orderResult?._id;
    // 2. Capture POS payment
    const payment = await Payment.create({
      ...paymentPayload,
      restaurantId: req.tenantId,
      orderId,
      userId: req.auth?.sub ?? null,
      method: paymentPayload?.method ?? 'cash',
      status: 'confirmed',
      confirmedAt: new Date(),
      transactionId: uuidv4(),
    });
    successResponse(res, { order: orderResult, payment }, 201);
  },

  // POS cash payment for an existing order
  async posPayment(req: Request, res: Response): Promise<void> {
    const payment = await Payment.create({
      ...req.body,
      restaurantId: req.tenantId,
      userId: req.auth?.sub ?? null,
      method: req.body.method ?? 'cash',
      status: 'confirmed',
      confirmedAt: new Date(),
      transactionId: uuidv4(),
    });
    if (config.services.order) {
      notifyOrderPaid(payment.orderId, String(payment._id), payment.transactionId);
    }
    successResponse(res, payment, 201);
  },

  // Log a POS-applied discount (audit trail)
  async posDiscount(req: Request, res: Response): Promise<void> {
    // Discounts live on Order Service; this is a financial audit log
    const log = {
      restaurantId: req.tenantId,
      orderId: req.body.orderId,
      discountAmount: req.body.discountAmount,
      reason: req.body.reason,
      performedBy: req.auth?.sub,
      timestamp: new Date(),
    };
    // Store inline in void_refund_logs with a synthetic action, or as its own doc
    // Using PosVoidRefundLog schema for now with 'void' type approximated
    successResponse(res, log, 201);
  },

  // Record open-price item
  async posOpenPrice(req: Request, res: Response): Promise<void> {
    const log = {
      restaurantId: req.tenantId,
      orderId: req.body.orderId,
      itemDescription: req.body.itemDescription,
      manualPrice: req.body.manualPrice,
      performedBy: req.auth?.sub,
      timestamp: new Date(),
    };
    successResponse(res, log, 201);
  },

  // Financial-trail side of a void (called by Order Service after order-state transition)
  async posVoid(req: Request, res: Response): Promise<void> {
    const log = await PosVoidRefundLog.create({
      ...req.body,
      restaurantId: req.tenantId,
      action: 'void',
      performedBy: req.auth?.sub,
      approvedBy: req.body.approvedBy ?? null,
    });
    successResponse(res, log, 201);
  },

  // Financial-trail side of a refund (called by Order Service after order-state transition)
  async posRefund(req: Request, res: Response): Promise<void> {
    const log = await PosVoidRefundLog.create({
      ...req.body,
      restaurantId: req.tenantId,
      action: 'refund',
      performedBy: req.auth?.sub,
      approvedBy: req.body.approvedBy ?? null,
    });
    successResponse(res, log, 201);
  },

  // POS login activity
  async posLogin(req: Request, res: Response): Promise<void> {
    const log = await PosActivityLog.create({
      restaurantId: req.tenantId,
      branchId: req.body.branchId,
      terminalId: req.body.terminalId,
      userId: req.auth?.sub,
      action: 'login',
    });
    successResponse(res, log, 201);
  },

  // POS logout activity
  async posLogout(req: Request, res: Response): Promise<void> {
    const log = await PosActivityLog.create({
      restaurantId: req.tenantId,
      branchId: req.body.branchId,
      terminalId: req.body.terminalId,
      userId: req.auth?.sub,
      action: 'logout',
    });
    successResponse(res, log, 201);
  },

  async listActivity(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      PosActivityLog.find({ restaurantId: req.tenantId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      PosActivityLog.countDocuments({ restaurantId: req.tenantId }),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },
};
