import { Request, Response } from 'express';
import { PosTerminal } from './model';
import { successResponse, errorResponse } from '../../utils/response';

export const posTerminalsController = {
  async create(req: Request, res: Response): Promise<void> {
    const terminal = await PosTerminal.create({ ...req.body, restaurantId: req.tenantId });
    successResponse(res, terminal, 201);
  },

  async list(req: Request, res: Response): Promise<void> {
    const terminals = await PosTerminal.find({ restaurantId: req.tenantId }).lean();
    successResponse(res, terminals);
  },

  async getOne(req: Request, res: Response): Promise<void> {
    const terminal = await PosTerminal.findOne({ _id: req.params.id, restaurantId: req.tenantId }).lean();
    if (!terminal) { errorResponse(res, 'NOT_FOUND', 'Terminal not found', 404); return; }
    successResponse(res, terminal);
  },

  async update(req: Request, res: Response): Promise<void> {
    const terminal = await PosTerminal.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      req.body,
      { new: true },
    );
    if (!terminal) { errorResponse(res, 'NOT_FOUND', 'Terminal not found', 404); return; }
    successResponse(res, terminal);
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const terminal = await PosTerminal.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { isActive: req.body.isActive },
      { new: true },
    );
    if (!terminal) { errorResponse(res, 'NOT_FOUND', 'Terminal not found', 404); return; }
    successResponse(res, terminal);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const terminal = await PosTerminal.findOneAndDelete({ _id: req.params.id, restaurantId: req.tenantId });
    if (!terminal) { errorResponse(res, 'NOT_FOUND', 'Terminal not found', 404); return; }
    successResponse(res, { deleted: true });
  },

  async lock(req: Request, res: Response): Promise<void> {
    const terminal = await PosTerminal.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { isLocked: true, lockedAt: new Date(), lockedBy: req.auth?.sub },
      { new: true },
    );
    if (!terminal) { errorResponse(res, 'NOT_FOUND', 'Terminal not found', 404); return; }
    successResponse(res, terminal);
  },

  async unlock(req: Request, res: Response): Promise<void> {
    const terminal = await PosTerminal.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { isLocked: false, lockedAt: null, lockedBy: null },
      { new: true },
    );
    if (!terminal) { errorResponse(res, 'NOT_FOUND', 'Terminal not found', 404); return; }
    successResponse(res, terminal);
  },
};
