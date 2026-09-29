import { Request, Response } from 'express';
import { DeliverymanWallet } from './model';
import { successResponse, errorResponse } from '../../utils/response';

async function computeBalance(restaurantId: string, deliveryManId: string): Promise<number> {
  const agg = await DeliverymanWallet.aggregate([
    { $match: { restaurantId, deliveryManId } },
    { $group: { _id: null, balance: { $sum: '$amount' } } },
  ]);
  return agg[0]?.balance ?? 0;
}

export const deliverymanWalletController = {
  async getBalance(req: Request, res: Response): Promise<void> {
    const { deliveryManId } = req.params;
    const balance = await computeBalance(req.tenantId!, deliveryManId);
    successResponse(res, { deliveryManId, balance });
  },

  async credit(req: Request, res: Response): Promise<void> {
    const { deliveryManId } = req.params;
    const { amount, reference } = req.body;
    const entry = await DeliverymanWallet.create({
      restaurantId: req.tenantId,
      deliveryManId,
      amount: Math.abs(Number(amount)),
      transactionType: 'credit',
      reference: reference ?? '',
    });
    successResponse(res, entry, 201);
  },

  async debit(req: Request, res: Response): Promise<void> {
    const { deliveryManId } = req.params;
    const { amount, reference } = req.body;
    const balance = await computeBalance(req.tenantId!, deliveryManId);
    if (balance < Number(amount)) {
      errorResponse(res, 'INSUFFICIENT_BALANCE', 'Deliveryman wallet balance is insufficient', 400);
      return;
    }
    const entry = await DeliverymanWallet.create({
      restaurantId: req.tenantId,
      deliveryManId,
      amount: -Math.abs(Number(amount)),
      transactionType: 'debit',
      reference: reference ?? '',
    });
    successResponse(res, entry, 201);
  },

  async listTransactions(req: Request, res: Response): Promise<void> {
    const { deliveryManId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { restaurantId: req.tenantId, deliveryManId };
    const [items, total] = await Promise.all([
      DeliverymanWallet.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      DeliverymanWallet.countDocuments(filter),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },
};
