import { Request, Response } from 'express';
import { CashDrawerOperation } from './model';
import { PosSession } from '../pos-sessions/model';
import { successResponse } from '../../utils/response';

export const cashDrawerController = {
  async cashIn(req: Request, res: Response): Promise<void> {
    const op = await CashDrawerOperation.create({
      ...req.body,
      restaurantId: req.tenantId,
      operationType: 'cash_in',
      performedBy: req.auth?.sub,
    });
    successResponse(res, op, 201);
  },

  async cashOut(req: Request, res: Response): Promise<void> {
    const op = await CashDrawerOperation.create({
      ...req.body,
      restaurantId: req.tenantId,
      operationType: 'cash_out',
      performedBy: req.auth?.sub,
    });
    successResponse(res, op, 201);
  },

  async noSale(req: Request, res: Response): Promise<void> {
    const op = await CashDrawerOperation.create({
      ...req.body,
      restaurantId: req.tenantId,
      operationType: 'no_sale',
      amount: 0,
      performedBy: req.auth?.sub,
    });
    successResponse(res, op, 201);
  },

  async listOperations(req: Request, res: Response): Promise<void> {
    const { posSessionId, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = { restaurantId: req.tenantId };
    if (posSessionId) filter.posSessionId = posSessionId;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      CashDrawerOperation.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      CashDrawerOperation.countDocuments(filter),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },

  // GET /cash-drawer — current drawer state (dashboard §3.2). Resolves the
  // restaurant's most recent open POS session; there is no free-floating drawer
  // balance — every cash movement is bound to a POS session.
  async getDrawer(req: Request, res: Response): Promise<void> {
    const openSession = await PosSession.findOne({ restaurantId: req.tenantId, status: 'open' })
      .sort({ openedAt: -1 })
      .lean();
    successResponse(res, {
      openSessionId: openSession ? String(openSession._id) : null,
      openingCash: openSession?.openingCash ?? 0,
      openedAt: openSession?.openedAt ?? null,
      status: openSession ? 'open' : 'closed',
    });
  },
};
