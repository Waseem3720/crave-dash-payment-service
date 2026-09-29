import { Request, Response } from 'express';
import { WalletAccount, WalletTransaction, WalletBonus } from './model';
import { successResponse, errorResponse } from '../../utils/response';
import { withTransaction } from '../../utils/transaction';
import { postWalletTopupJournal } from '../../clients/accounting.client';

// Helper: get or create wallet account
async function getOrCreateWallet(restaurantId: string, userId: string) {
  let wallet = await WalletAccount.findOne({ restaurantId, userId });
  if (!wallet) {
    wallet = await WalletAccount.create({ restaurantId, userId, balance: 0 });
  }
  return wallet;
}

// Helper: apply credit atomically inside a session
async function creditWallet(
  restaurantId: string,
  userId: string,
  amount: number,
  transactionType: IWalletTransaction['transactionType'],
  reference: string,
  session: import('mongoose').ClientSession,
) {
  const wallet = await WalletAccount.findOneAndUpdate(
    { restaurantId, userId },
    { $inc: { balance: amount } },
    { new: true, upsert: true, session },
  );
  const txn = await WalletTransaction.create(
    [
      {
        restaurantId,
        userId,
        walletAccountId: wallet!._id.toString(),
        credit: amount,
        debit: 0,
        adminBonus: transactionType === 'bonus' ? amount : 0,
        balance: wallet!.balance,
        transactionType,
        reference,
      },
    ],
    { session },
  );
  return { wallet, txn: txn[0] };
}

// Helper: apply debit atomically inside a session
async function debitWallet(
  restaurantId: string,
  userId: string,
  amount: number,
  transactionType: IWalletTransaction['transactionType'],
  reference: string,
  session: import('mongoose').ClientSession,
) {
  const wallet = await WalletAccount.findOne({ restaurantId, userId }).session(session);
  if (!wallet || wallet.balance < amount) {
    throw new Error('INSUFFICIENT_BALANCE');
  }
  wallet.balance -= amount;
  await wallet.save({ session });
  const txn = await WalletTransaction.create(
    [
      {
        restaurantId,
        userId,
        walletAccountId: wallet._id.toString(),
        credit: 0,
        debit: amount,
        adminBonus: 0,
        balance: wallet.balance,
        transactionType,
        reference,
      },
    ],
    { session },
  );
  return { wallet, txn: txn[0] };
}

// Fix the import for the type
type IWalletTransaction = import('./model').IWalletTransaction;

export const walletController = {
  // GET /wallet — customer's own balance (never accept userId override)
  async getBalance(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.sub;
    const wallet = await getOrCreateWallet(req.tenantId!, userId);
    successResponse(res, { balance: wallet.balance, userId });
  },

  // POST /wallet/add-funds — customer tops up via gateway payment request
  async addFunds(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.sub;
    const { amount, reference } = req.body;
    const now = new Date();

    // Check for applicable bonus rule
    const bonusRule = await WalletBonus.findOne({
      restaurantId: req.tenantId,
      isActive: true,
      minimumAddAmount: { $lte: amount },
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    let bonusAmount = 0;
    if (bonusRule) {
      if (bonusRule.bonusType === 'percentage') {
        bonusAmount = Math.min((amount * bonusRule.bonusAmount) / 100, bonusRule.maximumBonusAmount || Infinity);
      } else {
        bonusAmount = bonusRule.bonusAmount;
      }
    }

    await withTransaction(async (session) => {
      await creditWallet(req.tenantId!, userId, amount, 'topup', reference ?? '', session);
      if (bonusAmount > 0) {
        await creditWallet(req.tenantId!, userId, bonusAmount, 'bonus', `bonus:${bonusRule!._id}`, session);
      }
    });

    const wallet = await WalletAccount.findOne({ restaurantId: req.tenantId, userId }).lean();
    // Response keys per the frontend contract: balance, topupAmount, bonusAmount
    // (legacy bonusApplied kept for compatibility).
    successResponse(res, {
      balance: wallet?.balance,
      topupAmount: amount,
      bonusAmount,
      bonusApplied: bonusAmount,
    });

    // readme2.md §14 appendix #19 — real cash entered via top-up: optional
    // wallet_topup journal entry (fire-and-forget, env-gated).
    postWalletTopupJournal(req.tenantId!, userId, amount).catch(() => {});
  },

  // POST /wallet/credit — admin-triggered credit
  async credit(req: Request, res: Response): Promise<void> {
    const { userId, amount, reference } = req.body;
    const result = await withTransaction(async (session) =>
      creditWallet(req.tenantId!, userId, amount, 'credit', reference ?? '', session),
    );
    successResponse(res, result.wallet);
  },

  // ─── Admin reads (readme2.md §8) — permission-gated in routes ─────────────

  // GET /wallet/admin/:userId — balance + recent transactions for a customer
  async adminGetWallet(req: Request, res: Response): Promise<void> {
    const userId = req.params['userId'] as string;
    const { page = 1, limit = 10 } = req.query;
    const wallet = await WalletAccount.findOne({ restaurantId: req.tenantId, userId }).lean();
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { restaurantId: req.tenantId, userId };
    const [items, total] = await Promise.all([
      WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      WalletTransaction.countDocuments(filter),
    ]);
    successResponse(res, { userId, balance: wallet?.balance ?? 0, transactions: items }, 200, {
      page: Number(page),
      limit: Number(limit),
      total,
    });
  },

  // POST /wallet/debit — admin-triggered debit
  async debit(req: Request, res: Response): Promise<void> {
    const { userId, amount, reference } = req.body;
    try {
      const result = await withTransaction(async (session) =>
        debitWallet(req.tenantId!, userId, amount, 'debit', reference ?? '', session),
      );
      successResponse(res, result.wallet);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'INSUFFICIENT_BALANCE') {
        errorResponse(res, 'INSUFFICIENT_BALANCE', 'Wallet balance is insufficient', 400);
        return;
      }
      throw e;
    }
  },

  // GET /wallet/transactions
  async listTransactions(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.sub;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { restaurantId: req.tenantId, userId };
    const [items, total] = await Promise.all([
      WalletTransaction.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      WalletTransaction.countDocuments(filter),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },

  // GET /wallet/transactions/:id
  async getTransaction(req: Request, res: Response): Promise<void> {
    const txn = await WalletTransaction.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
      userId: req.auth!.sub,
    }).lean();
    if (!txn) { errorResponse(res, 'NOT_FOUND', 'Transaction not found', 404); return; }
    successResponse(res, txn);
  },

  // Wallet Bonus Rules
  async listBonuses(req: Request, res: Response): Promise<void> {
    const bonuses = await WalletBonus.find({ restaurantId: req.tenantId, isActive: true }).lean();
    successResponse(res, bonuses);
  },

  async createBonus(req: Request, res: Response): Promise<void> {
    const bonus = await WalletBonus.create({ ...req.body, restaurantId: req.tenantId });
    successResponse(res, bonus, 201);
  },

  async getBonus(req: Request, res: Response): Promise<void> {
    const bonus = await WalletBonus.findOne({ _id: req.params.id, restaurantId: req.tenantId }).lean();
    if (!bonus) { errorResponse(res, 'NOT_FOUND', 'Bonus not found', 404); return; }
    successResponse(res, bonus);
  },

  async updateBonus(req: Request, res: Response): Promise<void> {
    const bonus = await WalletBonus.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      req.body,
      { new: true },
    );
    if (!bonus) { errorResponse(res, 'NOT_FOUND', 'Bonus not found', 404); return; }
    successResponse(res, bonus);
  },

  async updateBonusStatus(req: Request, res: Response): Promise<void> {
    const bonus = await WalletBonus.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { isActive: req.body.isActive },
      { new: true },
    );
    if (!bonus) { errorResponse(res, 'NOT_FOUND', 'Bonus not found', 404); return; }
    successResponse(res, bonus);
  },
};

// Export helpers for cross-module use (loyalty convert, payment debit)
export { creditWallet, debitWallet };
