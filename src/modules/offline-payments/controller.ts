import { Request, Response } from 'express';
import { OfflinePaymentMethod, OfflinePayment } from './model';
import { successResponse, errorResponse } from '../../utils/response';

export const offlinePaymentController = {
  async listMethods(req: Request, res: Response): Promise<void> {
    const methods = await OfflinePaymentMethod.find({ restaurantId: req.tenantId }).lean();
    successResponse(res, methods);
  },

  async createMethod(req: Request, res: Response): Promise<void> {
    const method = await OfflinePaymentMethod.create({ ...req.body, restaurantId: req.tenantId });
    successResponse(res, method, 201);
  },

  async updateMethod(req: Request, res: Response): Promise<void> {
    const method = await OfflinePaymentMethod.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      req.body,
      { new: true },
    );
    if (!method) { errorResponse(res, 'NOT_FOUND', 'Method not found', 404); return; }
    successResponse(res, method);
  },

  async deleteMethod(req: Request, res: Response): Promise<void> {
    const method = await OfflinePaymentMethod.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });
    if (!method) { errorResponse(res, 'NOT_FOUND', 'Method not found', 404); return; }
    successResponse(res, { deleted: true });
  },

  async submitOfflinePayment(req: Request, res: Response): Promise<void> {
    const payment = await OfflinePayment.create({ ...req.body, restaurantId: req.tenantId });
    successResponse(res, payment, 201);
  },

  async listOfflinePayments(req: Request, res: Response): Promise<void> {
    const { orderId, status, page = 1, limit = 20 } = req.query;
    const filter: Record<string, unknown> = { restaurantId: req.tenantId };
    if (orderId) filter.orderId = orderId;
    if (status) filter.status = status;
    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      OfflinePayment.find(filter).skip(skip).limit(Number(limit)).lean(),
      OfflinePayment.countDocuments(filter),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },

  async verifyOfflinePayment(req: Request, res: Response): Promise<void> {
    const payment = await OfflinePayment.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { status: req.body.status },
      { new: true },
    );
    if (!payment) { errorResponse(res, 'NOT_FOUND', 'Payment not found', 404); return; }
    successResponse(res, payment);
  },
};
