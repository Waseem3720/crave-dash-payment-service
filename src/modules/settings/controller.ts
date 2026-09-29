import { Request, Response } from 'express';
import { WalletLoyaltySetting } from './model';
import { successResponse } from '../../utils/response';

export const settingsController = {
  async get(req: Request, res: Response): Promise<void> {
    let settings = await WalletLoyaltySetting.findOne({ restaurantId: req.tenantId });
    if (!settings) {
      settings = await WalletLoyaltySetting.create({ restaurantId: req.tenantId });
    }
    successResponse(res, settings);
  },

  async update(req: Request, res: Response): Promise<void> {
    const settings = await WalletLoyaltySetting.findOneAndUpdate(
      { restaurantId: req.tenantId },
      req.body,
      { new: true, upsert: true },
    );
    successResponse(res, settings);
  },
};
