import { Request, Response } from 'express';
import { PointTransition } from './model';
import { WalletLoyaltySetting } from '../settings/model';
import { successResponse, errorResponse } from '../../utils/response';
import { withTransaction } from '../../utils/transaction';
import { creditWallet } from '../wallet/controller';

// Helper: compute current point balance for a user
async function getPointBalance(restaurantId: string, userId: string): Promise<number> {
  const agg = await PointTransition.aggregate([
    { $match: { restaurantId, userId } },
    { $group: { _id: null, balance: { $sum: '$amount' } } },
  ]);
  return agg[0]?.balance ?? 0;
}

export const loyaltyController = {
  // GET /loyalty/points — customer's own balance
  // `balance` is the storefront-facing key (Frontend_with_no_images.md §5.4);
  // `pointsBalance` kept as an alias.
  async getBalance(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.sub;
    const balance = await getPointBalance(req.tenantId!, userId);
    successResponse(res, { userId, balance, pointsBalance: balance });
  },

  // POST /loyalty/points/earn — order-triggered or admin-triggered
  async earn(req: Request, res: Response): Promise<void> {
    const { userId, amount, reference } = req.body;
    const restaurantId = req.tenantId!;
    const currentBalance = await getPointBalance(restaurantId, userId);
    const newBalance = currentBalance + Number(amount);

    const transition = await PointTransition.create({
      restaurantId,
      userId,
      type: 'earn',
      amount: Number(amount),
      credit: Number(amount),
      debit: 0,
      balance: newBalance,
      reference: reference ?? '',
    });
    successResponse(res, transition, 201);
  },

  // POST /loyalty/points/deduct — redemption
  async deduct(req: Request, res: Response): Promise<void> {
    const { userId, amount, reference } = req.body;
    const restaurantId = req.tenantId!;
    const currentBalance = await getPointBalance(restaurantId, userId);

    if (currentBalance < Number(amount)) {
      errorResponse(res, 'INSUFFICIENT_POINTS', 'Not enough loyalty points', 400);
      return;
    }
    const newBalance = currentBalance - Number(amount);
    const transition = await PointTransition.create({
      restaurantId,
      userId,
      type: 'deduct',
      amount: -Number(amount),
      credit: 0,
      debit: Number(amount),
      balance: newBalance,
      reference: reference ?? '',
    });
    successResponse(res, transition, 201);
  },

  // POST /loyalty/points/convert — points → wallet credit (atomic)
  // Storefront sends { points } (Frontend_with_no_images.md §5.4); pointsToConvert
  // is accepted for backwards compatibility.
  async convert(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.sub;
    const pointsToConvert = Number(req.body.points ?? req.body.pointsToConvert);
    const restaurantId = req.tenantId!;

    // Load settings for exchange rate and minimum
    const settings = await WalletLoyaltySetting.findOne({ restaurantId }).lean();
    const minPoints = settings?.loyaltyPointMinimumPoint ?? 0;
    const exchangeRate = settings?.loyaltyPointExchangeRate ?? 1;

    const currentBalance = await getPointBalance(restaurantId, userId);

    if (currentBalance < minPoints) {
      errorResponse(res, 'BELOW_MINIMUM', `Minimum ${minPoints} points required to convert`, 400);
      return;
    }
    if (currentBalance < pointsToConvert) {
      errorResponse(res, 'INSUFFICIENT_POINTS', 'Not enough loyalty points', 400);
      return;
    }

    const walletCredit = pointsToConvert * exchangeRate;
    const newPointBalance = currentBalance - pointsToConvert;

    let walletBalance = 0;
    await withTransaction(async (session) => {
      // 1. Record point deduction
      await PointTransition.create(
        [
          {
            restaurantId,
            userId,
            type: 'convert',
            amount: -pointsToConvert,
            credit: 0,
            debit: pointsToConvert,
            balance: newPointBalance,
            reference: 'convert_to_wallet',
          },
        ],
        { session },
      );
      // 2. Credit wallet
      const result = await creditWallet(restaurantId, userId, walletCredit, 'convert', 'loyalty_convert', session);
      walletBalance = result.wallet.balance;
    });

    // Response keys per the frontend contract: convertedPoints, pointsBalance,
    // walletCredit, walletBalance (legacy walletCredited kept for compat).
    successResponse(res, {
      convertedPoints: pointsToConvert,
      pointsBalance: newPointBalance,
      walletCredit,
      walletBalance,
      walletCredited: walletCredit,
    });
  },

  // POST /loyalty/order-completion — server-side earn trigger (O-8).
  // Called by Order Service when an order completes; idempotent per orderId so
  // retries never double-credit. Applies the restaurant's earn threshold/points
  // from settings so the frontend rule can be retired (O-20).
  async orderCompletion(req: Request, res: Response): Promise<void> {
    const { orderId, userId, orderAmount } = req.body;
    const restaurantId = req.tenantId!;
    if (!orderId || !userId || orderAmount == null) {
      errorResponse(res, 'VALIDATION_ERROR', 'orderId, userId and orderAmount are required', 400);
      return;
    }

    // Idempotency: skip if this order already earned points
    const existing = await PointTransition.findOne({ restaurantId, orderId, type: 'earn' }).lean();
    if (existing) {
      successResponse(res, { skipped: true, alreadyCredited: true, points: existing.credit });
      return;
    }

    const settings = await WalletLoyaltySetting.findOne({ restaurantId }).lean();
    const threshold = settings?.loyaltyEarnThreshold ?? 50;
    const earnPoints = settings?.loyaltyEarnPoints ?? 10;

    if (Number(orderAmount) < threshold) {
      successResponse(res, { skipped: true, reason: 'below_threshold', threshold });
      return;
    }

    const currentBalance = await getPointBalance(restaurantId, userId);
    const newBalance = currentBalance + earnPoints;
    try {
      await PointTransition.create({
        restaurantId,
        userId,
        type: 'earn',
        amount: earnPoints,
        credit: earnPoints,
        debit: 0,
        balance: newBalance,
        reference: `order:${orderId}`,
        orderId,
      });
    } catch (e: unknown) {
      // Race loser on the unique index — treat as already credited
      if ((e as { code?: number }).code === 11000) {
        successResponse(res, { skipped: true, alreadyCredited: true });
        return;
      }
      throw e;
    }
    successResponse(res, { credited: earnPoints, pointsBalance: newBalance }, 201);
  },

  // GET /loyalty/transactions
  async listTransactions(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.sub;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { restaurantId: req.tenantId, userId };
    const [items, total] = await Promise.all([
      PointTransition.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      PointTransition.countDocuments(filter),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },

  // ─── Admin reads/ops (readme2.md §8) — permission-gated in routes ─────────

  // GET /loyalty/admin/:userId — points balance + transactions for a customer
  async adminGetLoyalty(req: Request, res: Response): Promise<void> {
    const userId = req.params['userId'] as string;
    const { page = 1, limit = 10 } = req.query;
    const balance = await getPointBalance(req.tenantId!, userId);
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { restaurantId: req.tenantId, userId };
    const [items, total] = await Promise.all([
      PointTransition.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      PointTransition.countDocuments(filter),
    ]);
    successResponse(res, { userId, balance, pointsBalance: balance, transactions: items }, 200, {
      page: Number(page),
      limit: Number(limit),
      total,
    });
  },

  // POST /loyalty/admin/:userId/redeem — admin-triggered redemption (same ledger path as customer deduct)
  async adminRedeem(req: Request, res: Response): Promise<void> {
    const userId = req.params['userId'] as string;
    const amount = Number(req.body?.points);
    const restaurantId = req.tenantId!;
    if (!Number.isFinite(amount) || amount <= 0) {
      errorResponse(res, 'VALIDATION_ERROR', 'points (positive number) is required', 400);
      return;
    }
    const currentBalance = await getPointBalance(restaurantId, userId);
    if (currentBalance < amount) {
      errorResponse(res, 'INSUFFICIENT_POINTS', 'Not enough loyalty points', 400);
      return;
    }
    const transition = await PointTransition.create({
      restaurantId,
      userId,
      type: 'deduct',
      amount: -amount,
      credit: 0,
      debit: amount,
      balance: currentBalance - amount,
      reference: req.body?.orderId ? `order:${req.body.orderId}` : 'admin_redeem',
    });
    successResponse(res, { userId, pointsBalance: currentBalance - amount, transaction: transition }, 201);
  },
};
