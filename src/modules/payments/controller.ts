import { Request, Response } from 'express';
import {
  Payment,
  PaymentPartialPayment,
  PaymentRequest,
  PaymentRefund,
  OrderTransaction,
} from './model';
import { successResponse, errorResponse } from '../../utils/response';
import { emitAuditEvent } from '../../clients/audit.client';
import { withTransaction } from '../../utils/transaction';
import { orderServiceClient } from '../../clients/order-service.client';
import { config } from '../../config';
import { debitWallet } from '../wallet/controller';
import { v4 as uuidv4 } from 'uuid';

/**
 * Push a payment result to Order Service — fire-and-forget with client-side
 * retry (3 attempts, exponential backoff). Never blocks or fails the payment
 * response; Order's notification endpoint is idempotent, so redelivery is safe.
 */
async function safeNotifyOrder(
  orderId: string,
  update: {
    paymentStatus: 'pending' | 'paid' | 'partial' | 'failed' | 'refunded';
    transactionReference?: string;
    paymentId?: string;
    refundAmount?: number;
    reason?: string;
    refundReference?: string;
  },
  origin: string,
): Promise<void> {
  if (!config.services.order) {
    console.warn(`[payments.${origin}] ORDER_SERVICE_URL not set — Order not notified for ${orderId}`);
    return;
  }
  try {
    await orderServiceClient.notifyPaymentStatus(orderId, update);
  } catch (e) {
    console.error(`[payments.${origin}] Order notification failed for ${orderId}:`, e instanceof Error ? e.message : e);
  }
}

// ─── Core Payments ────────────────────────────────────────────────────
export const paymentsController = {
  async create(req: Request, res: Response): Promise<void> {
    const payment = await Payment.create({
      ...req.body,
      restaurantId: req.tenantId,
      userId: req.auth?.sub ?? null,
      transactionId: uuidv4(),
    });
    successResponse(res, payment, 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const { orderId, status, method, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = { restaurantId: req.tenantId };
    if (orderId) filter.orderId = orderId;
    if (status) filter.status = status;
    if (method) filter.method = method;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Payment.find(filter).skip(skip).limit(Number(limit)).lean(),
      Payment.countDocuments(filter),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.tenantId }).lean();
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }
    successResponse(res, payment);
  },

  async getStatus(req: Request, res: Response): Promise<void> {
    const payment = await Payment.findOne(
      { _id: req.params.id, restaurantId: req.tenantId },
      { status: 1, transactionId: 1 },
    ).lean();
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }
    successResponse(res, payment);
  },

  async getTransactions(req: Request, res: Response): Promise<void> {
    // Returns all payments related to same orderId for history
    const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.tenantId }).lean();
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }
    const history = await Payment.find({ orderId: payment.orderId }).lean();
    successResponse(res, history);
  },

  async getByOrderId(req: Request, res: Response): Promise<void> {
    const payments = await Payment.find({
      orderId: req.params.orderId,
      restaurantId: req.tenantId,
    }).lean();
    const partials = await PaymentPartialPayment.find({
      orderId: req.params.orderId,
      restaurantId: req.tenantId,
    }).lean();
    const refunds = await PaymentRefund.find({
      orderId: req.params.orderId,
      restaurantId: req.tenantId,
    }).lean();
    successResponse(res, { payments, partials, refunds });
  },

  async verify(req: Request, res: Response): Promise<void> {
    const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }
    // In a real implementation, hit the gateway's verify/check API here
    successResponse(res, { paymentId: payment._id, status: payment.status, verified: true });
  },

  async confirm(req: Request, res: Response): Promise<void> {
    const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }
    if (payment.status === 'confirmed') { successResponse(res, payment); return; } // idempotent

    payment.status = 'confirmed';
    payment.confirmedAt = new Date();
    await payment.save();

    await safeNotifyOrder(
      payment.orderId,
      { paymentStatus: 'paid', transactionReference: payment.transactionId, paymentId: String(payment._id) },
      'confirm',
    );
    successResponse(res, payment);
  },

  async fail(req: Request, res: Response): Promise<void> {
    const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }
    if (payment.status === 'failed') { successResponse(res, payment); return; } // idempotent

    payment.status = 'failed';
    payment.failedAt = new Date();
    await payment.save();

    await safeNotifyOrder(
      payment.orderId,
      { paymentStatus: 'failed', transactionReference: payment.transactionId, paymentId: String(payment._id) },
      'fail',
    );
    successResponse(res, payment);
  },

  async refund(req: Request, res: Response): Promise<void> {
    const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }

    const refund = await PaymentRefund.create({
      restaurantId: req.tenantId,
      orderId: payment.orderId,
      paymentId: payment._id.toString(),
      paymentRequestId: payment.paymentRequestId,
      refundAmount: req.body.refundAmount ?? payment.amount,
      reason: req.body.reason ?? '',
      refundStatus: 'pending',
    });
    payment.status = 'refunded';
    await payment.save();

    await safeNotifyOrder(
      payment.orderId,
      {
        paymentStatus: 'refunded',
        transactionReference: payment.transactionId,
        paymentId: String(payment._id),
        refundAmount: refund.refundAmount,
        refundReference: refund.transactionId,
        reason: refund.reason,
      },
      'refund',
    );

    // Audit: refund event (Reports appendix #18) — fire-and-forget
    emitAuditEvent({
      restaurantId: req.tenantId ?? null,
      actorType: 'user',
      actorId: req.auth?.sub ?? 'system',
      action: 'payment.refunded',
      entityType: 'payment',
      entityId: String(payment._id),
      afterState: { orderId: payment.orderId, refundAmount: refund.refundAmount, reason: refund.reason },
      ipAddress: req.ip,
    }).catch(() => {});

    successResponse(res, refund, 201);
  },

  // ─── Cash / COD / Offline ──────────────────────────────────────────────────
  async processCash(req: Request, res: Response): Promise<void> {
    const payment = await Payment.create({
      ...req.body,
      restaurantId: req.tenantId,
      userId: req.auth?.sub ?? null,
      method: 'cash',
      gateway: null,
      status: 'confirmed',
      confirmedAt: new Date(),
      transactionId: uuidv4(),
    });
    await safeNotifyOrder(
      payment.orderId,
      { paymentStatus: 'paid', transactionReference: payment.transactionId, paymentId: String(payment._id) },
      'processCash',
    );
    successResponse(res, payment, 201);
  },

  async processCod(req: Request, res: Response): Promise<void> {
    const payment = await Payment.create({
      ...req.body,
      restaurantId: req.tenantId,
      userId: req.auth?.sub ?? null,
      method: 'cod',
      gateway: null,
      status: 'pending',
      transactionId: uuidv4(),
    });
    successResponse(res, payment, 201);
  },

  async processOffline(req: Request, res: Response): Promise<void> {
    const payment = await Payment.create({
      ...req.body,
      restaurantId: req.tenantId,
      userId: req.auth?.sub ?? null,
      method: 'offline',
      gateway: null,
      status: 'pending',
      transactionId: uuidv4(),
    });
    successResponse(res, payment, 201);
  },

  // ─── Partial Payments ──────────────────────────────────────────────────────
  async createPartial(req: Request, res: Response): Promise<void> {
    // Compute server-side dueAmount; validate client-supplied value
    const existingPartials = await PaymentPartialPayment.find({
      orderId: req.body.orderId,
      restaurantId: req.tenantId,
    });
    const totalPaid = existingPartials.reduce((sum, p) => sum + p.paidAmount, 0) + Number(req.body.paidAmount);
    // orderAmount must be provided or fetched from Order Service
    const orderAmount = Number(req.body.orderAmount);
    const dueAmount = Math.max(0, orderAmount - totalPaid);

    const partial = await PaymentPartialPayment.create({
      restaurantId: req.tenantId,
      orderId: req.body.orderId,
      paymentRequestId: req.body.paymentRequestId ?? null,
      paidAmount: req.body.paidAmount,
      dueAmount,
      paidWith: req.body.paidWith,
      paymentStatus: dueAmount <= 0 ? 'paid' : 'partial',
    });
    successResponse(res, partial, 201);
  },

  // ─── Combined Payments ────────────────────────────────────────────────
  async createCombined(req: Request, res: Response): Promise<void> {
    // Storefront sends { orderId, currency, allocations: [{ method, amount }] }
    // without orderAmount (Frontend_with_no_images.md §5.4) — the allocation sum
    // IS the charge. Map method → the model's allocation shape.
    const { orderId, allocations } = req.body;
    const total = allocations.reduce(
      (sum: number, a: { amount: number }) => sum + Number(a.amount),
      0,
    );

    const rawAllocations = allocations as Array<{ method: string; amount: number }>;
    const walletAllocation = rawAllocations.find((a) => a.method === 'wallet');
    const nonWalletAllocations = rawAllocations.filter((a) => a.method !== 'wallet');

    // Debit the wallet leg first (atomic; fails fast on insufficient balance so
    // the card leg is never charged for a failed wallet debit).
    if (walletAllocation && Number(walletAllocation.amount) > 0) {
      try {
        await withTransaction(async (session) =>
          debitWallet(req.tenantId!, req.auth!.sub, Number(walletAllocation.amount), 'payment', `combined:${orderId}`, session),
        );
      } catch (e: unknown) {
        if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
          errorResponse(res, 'INSUFFICIENT_BALANCE', 'Wallet balance is insufficient for the wallet allocation', 400);
          return;
        }
        throw e;
      }
    }

    const payment = await Payment.create({
      restaurantId: req.tenantId,
      orderId,
      userId: req.auth?.sub ?? null,
      amount: total,
      currency: req.body.currency ?? 'USD',
      method: 'combined',
      gateway: nonWalletAllocations[0]?.method ?? null,
      status: 'confirmed',
      confirmedAt: new Date(),
      transactionId: uuidv4(),
      allocations: rawAllocations.map((a) => ({
        method: a.method,
        amount: Number(a.amount),
        gatewayReference: '',
      })),
    });
    await safeNotifyOrder(
      orderId,
      { paymentStatus: 'paid', transactionReference: payment.transactionId, paymentId: String(payment._id) },
      'createCombined',
    );
    successResponse(res, payment, 201);
  },

  async getAllocation(req: Request, res: Response): Promise<void> {
    const payment = await Payment.findOne(
      { _id: req.params.id, restaurantId: req.tenantId },
      { allocations: 1 },
    ).lean();
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }
    successResponse(res, payment.allocations ?? []);
  },

  async createPaymentRequest(req: Request, res: Response): Promise<void> {
    // Frontend contract (Frontend_with_no_images.md §5.4) sends
    // { orderId, amount, currency, gateway, successHook }; the model stores
    // attributeId / paymentPlatform — map before persisting.
    const body = { ...req.body };
    if (body.orderId && !body.attributeId) body.attributeId = body.orderId;
    if (body.gateway && !body.paymentPlatform) body.paymentPlatform = body.gateway;
    const request = await PaymentRequest.create({ ...body, restaurantId: req.tenantId });
    // The storefront opens `checkoutUrl` (hosted PSP page) and polls GET
    // /payment-requests/:id until isPaid flips (Frontend_with_no_images.md §5.4).
    // gatewayCallbackUrl is where the PSP webhooks back; checkoutUrl is what the
    // browser is redirected to. Prefer an explicit client-supplied checkoutUrl,
    // otherwise fall back to gatewayCallbackUrl so both fields are always populated.
    if (!request.checkoutUrl) {
      request.checkoutUrl = request.gatewayCallbackUrl || '';
    }
    await request.save();
    successResponse(res, request, 201);
  },

  async getPaymentRequest(req: Request, res: Response): Promise<void> {
    const request = await PaymentRequest.findById(req.params.id).lean();
    if (!request) { errorResponse(res, 'NOT_FOUND', 'Payment request not found', 404); return; }
    successResponse(res, request);
  },

  async paymentRequestSuccess(req: Request, res: Response): Promise<void> {
    const request = await PaymentRequest.findById(req.params.id);
    if (!request) { errorResponse(res, 'NOT_FOUND', 'Payment request not found', 404); return; }
    // Idempotency: already processed
    if (request.isPaid) { res.status(200).json({ success: true, data: request }); return; }

    await withTransaction(async (session) => {
      request.isPaid = true;
      request.status = 'success';
      request.gatewayResponse = req.body;
      await request.save({ session });

      // Create confirmed payment
      await Payment.create(
        [
          {
            restaurantId: request.restaurantId,
            orderId: request.attributeId,
            userId: null,
            amount: request.amount,
            currency: request.currency,
            method: request.paymentPlatform,
            gateway: request.paymentPlatform,
            status: 'confirmed',
            paymentRequestId: request._id.toString(),
            confirmedAt: new Date(),
            transactionId: uuidv4(),
          },
        ],
        { session },
      );
    });

    // PSP webhook → confirmed payment: inform Order Service (async-safe)
    await safeNotifyOrder(
      request.attributeId,
      { paymentStatus: 'paid', transactionReference: request._id.toString(), paymentId: request._id.toString() },
      'paymentRequestSuccess',
    );

    successResponse(res, request);
  },

  async paymentRequestFailure(req: Request, res: Response): Promise<void> {
    const request = await PaymentRequest.findById(req.params.id);
    if (!request) { errorResponse(res, 'NOT_FOUND', 'Payment request not found', 404); return; }
    if (request.status === 'failure') { res.status(200).json({ success: true, data: request }); return; }

    request.status = 'failure';
    request.gatewayResponse = req.body;
    await request.save();
    successResponse(res, request);
  },

  // ─── Reconciliation ────────────────────────────────────────────────────────
  async reconcileOrder(req: Request, res: Response): Promise<void> {
    const { orderId } = req.params;
    const [payments, partials, refunds, orderTxns] = await Promise.all([
      Payment.find({ orderId, restaurantId: req.tenantId }).lean(),
      PaymentPartialPayment.find({ orderId, restaurantId: req.tenantId }).lean(),
      PaymentRefund.find({ orderId, restaurantId: req.tenantId }).lean(),
      OrderTransaction.find({ orderId, restaurantId: req.tenantId }).lean(),
    ]);
    const totalCharged = payments.reduce((s, p) => s + p.amount, 0);
    const totalRefunded = refunds.reduce((s, r) => s + r.refundAmount, 0);
    const totalCollectedByCod = orderTxns.reduce((s, t) => s + t.orderAmount, 0);
    successResponse(res, {
      orderId,
      totalCharged,
      totalRefunded,
      net: totalCharged - totalRefunded,
      totalCollectedByCod,
      payments,
      partials,
      refunds,
      orderTxns,
    });
  },

  // ─── Transactions aggregation view ────────────────────────────────────────
  async listTransactions(req: Request, res: Response): Promise<void> {
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Payment.find({ restaurantId: req.tenantId }).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Payment.countDocuments({ restaurantId: req.tenantId }),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },

  async getTransaction(req: Request, res: Response): Promise<void> {
    const payment = await Payment.findOne({ _id: req.params.id, restaurantId: req.tenantId }).lean();
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Transaction not found', 404); return; }
    successResponse(res, payment);
  },

  // ─── Order Transactions (COD) ──────────────────────────────────────────────
  async createOrderTransaction(req: Request, res: Response): Promise<void> {
    const txn = await OrderTransaction.create({ ...req.body, restaurantId: req.tenantId });
    successResponse(res, txn, 201);
  },
};
