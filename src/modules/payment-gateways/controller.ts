import { Request, Response } from 'express';
import { PaymentGatewayConfig, PaymentGatewayConfigGlobal } from './model';
import { successResponse, errorResponse } from '../../utils/response';

// Mask sensitive keys for non-super-admin callers
function maskSecrets(doc: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...doc };
  if (masked.liveValues) masked.liveValues = '***';
  if (masked.testValues) masked.testValues = '***';
  return masked;
}

export const paymentGatewayController = {
  async list(req: Request, res: Response): Promise<void> {
    const gateways = await PaymentGatewayConfig.find({ restaurantId: req.tenantId }).lean();
    const isSuperAdmin = req.auth?.role === 'SAAS_SUPER_ADMIN' || req.auth?.role === 'RESTAURANT_SUPER_ADMIN';
    const result = isSuperAdmin ? gateways : gateways.map(maskSecrets);
    successResponse(res, result);
  },

  async create(req: Request, res: Response): Promise<void> {
    const gateway = await PaymentGatewayConfig.create({
      ...req.body,
      restaurantId: req.tenantId,
    });
    successResponse(res, gateway, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const gateway = await PaymentGatewayConfig.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      req.body,
      { new: true },
    );
    if (!gateway) { errorResponse(res, 'NOT_FOUND', 'Gateway not found', 404); return; }
    successResponse(res, gateway);
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const gateway = await PaymentGatewayConfig.findOneAndUpdate(
      { _id: req.params.id, restaurantId: req.tenantId },
      { isActive: req.body.isActive },
      { new: true },
    );
    if (!gateway) { errorResponse(res, 'NOT_FOUND', 'Gateway not found', 404); return; }
    successResponse(res, gateway);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const gateway = await PaymentGatewayConfig.findOneAndDelete({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });
    if (!gateway) { errorResponse(res, 'NOT_FOUND', 'Gateway not found', 404); return; }
    successResponse(res, { deleted: true });
  },

  // SaaS-wide global config
  async getGlobal(_req: Request, res: Response): Promise<void> {
    let global = await PaymentGatewayConfigGlobal.findOne();
    if (!global) global = await PaymentGatewayConfigGlobal.create({});
    successResponse(res, global);
  },

  async updateGlobal(req: Request, res: Response): Promise<void> {
    const global = await PaymentGatewayConfigGlobal.findOneAndUpdate(
      {},
      req.body,
      { new: true, upsert: true },
    );
    successResponse(res, global);
  },

  // Public aggregated payment methods
  async listPaymentMethods(req: Request, res: Response): Promise<void> {
    const gateways = await PaymentGatewayConfig.find(
      { restaurantId: req.tenantId, isActive: true },
      { keyName: 1, mode: 1 },
    ).lean();
    successResponse(res, { gateways, cash: true });
  },
};
