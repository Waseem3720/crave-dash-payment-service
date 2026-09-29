import { Request, Response } from 'express';
import { PosSession } from './model';
import { CashDrawerOperation } from '../cash-drawer/model';
import { Payment } from '../payments/model';
import { successResponse, errorResponse } from '../../utils/response';

export const posSessionsController = {
  async open(req: Request, res: Response): Promise<void> {
    // Enforce at-most-one open session per terminal
    const existing = await PosSession.findOne({
      terminalId: req.body.terminalId,
      restaurantId: req.tenantId,
      status: 'open',
    });
    if (existing) {
      errorResponse(res, 'CONFLICT', 'A session is already open for this terminal', 409);
      return;
    }
    const session = await PosSession.create({
      ...req.body,
      restaurantId: req.tenantId,
      operatorId: req.auth?.sub,
      status: 'open',
      openedAt: new Date(),
    });
    successResponse(res, session, 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const sessions = await PosSession.find({ restaurantId: req.tenantId })
      .sort({ createdAt: -1 })
      .lean();
    successResponse(res, sessions);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const session = await PosSession.findOne({ _id: req.params.id, restaurantId: req.tenantId }).lean();
    if (!session) { errorResponse(res, 'NOT_FOUND', 'Session not found', 404); return; }
    successResponse(res, session);
  },

  async close(req: Request, res: Response): Promise<void> {
    const session = await PosSession.findOne({ _id: req.params.id, restaurantId: req.tenantId });
    if (!session) { errorResponse(res, 'NOT_FOUND', 'Session not found', 404); return; }
    if (session.status === 'closed') {
      errorResponse(res, 'CONFLICT', 'Session already closed', 409);
      return;
    }

    // Compute expectedCash:
    // opening + cash-ins + cash-sales − cash-outs − cash-refunds
    const [cashIns, cashOuts, cashSales, cashRefunds] = await Promise.all([
      CashDrawerOperation.aggregate([
        { $match: { posSessionId: session._id.toString(), operationType: 'cash_in', restaurantId: req.tenantId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      CashDrawerOperation.aggregate([
        { $match: { posSessionId: session._id.toString(), operationType: 'cash_out', restaurantId: req.tenantId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { method: 'cash', status: 'confirmed', restaurantId: req.tenantId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.aggregate([
        { $match: { status: 'refunded', method: 'cash', restaurantId: req.tenantId } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const cashInTotal = (cashIns[0]?.total ?? 0) as number;
    const cashOutTotal = (cashOuts[0]?.total ?? 0) as number;
    const cashSalesTotal = (cashSales[0]?.total ?? 0) as number;
    const cashRefundsTotal = (cashRefunds[0]?.total ?? 0) as number;
    const expectedCash = session.openingCash + cashInTotal + cashSalesTotal - cashOutTotal - cashRefundsTotal;
    const closingCash = Number(req.body.closingCash);
    const overShort = closingCash - expectedCash;

    session.closingCash = closingCash;
    session.expectedCash = expectedCash;
    session.overShort = overShort;
    session.status = 'closed';
    session.closedAt = new Date();
    await session.save();
    successResponse(res, session);
  },

  async getBalance(req: Request, res: Response): Promise<void> {
    const session = await PosSession.findOne({ _id: req.params.id, restaurantId: req.tenantId }).lean();
    if (!session) { errorResponse(res, 'NOT_FOUND', 'Session not found', 404); return; }
    successResponse(res, { sessionId: session._id, openingCash: session.openingCash, status: session.status });
  },

  async getOperations(req: Request, res: Response): Promise<void> {
    const ops = await CashDrawerOperation.find({
      posSessionId: req.params.id,
      restaurantId: req.tenantId,
    }).lean();
    successResponse(res, ops);
  },

  async getZReport(req: Request, res: Response): Promise<void> {
    const session = await PosSession.findOne({ _id: req.params.id, restaurantId: req.tenantId }).lean();
    if (!session) { errorResponse(res, 'NOT_FOUND', 'Session not found', 404); return; }
    // Build Z-report data for Reporting Service consumption
    successResponse(res, {
      sessionId: session._id,
      terminalId: session.terminalId,
      operatorId: session.operatorId,
      openedAt: session.openedAt,
      closedAt: session.closedAt,
      openingCash: session.openingCash,
      closingCash: session.closingCash,
      expectedCash: session.expectedCash,
      overShort: session.overShort,
      status: session.status,
    });
  },
};
