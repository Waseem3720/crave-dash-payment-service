import { Request, Response } from 'express';
import { ReferralCustomer, ReferralCode } from './model';
import { WalletLoyaltySetting } from '../settings/model';
import { successResponse, errorResponse } from '../../utils/response';
import { withTransaction } from '../../utils/transaction';
import { creditWallet } from '../wallet/controller';

export const referralsController = {
  // GET /referrals/code — customer's own referral code
  async getCode(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.sub;
    let codeDoc = await ReferralCode.findOne({ restaurantId: req.tenantId, userId });
    if (!codeDoc) {
      codeDoc = await ReferralCode.create({ restaurantId: req.tenantId, userId });
    }
    successResponse(res, { code: codeDoc.code });
  },

  // POST /referrals — create referral relationship when a new customer signs up using a code
  async create(req: Request, res: Response): Promise<void> {
    const { referralCode } = req.body;
    const refereeId = req.auth!.sub;

    // Look up the code
    const codeDoc = await ReferralCode.findOne({ restaurantId: req.tenantId, code: referralCode }).lean();
    if (!codeDoc) {
      errorResponse(res, 'INVALID_CODE', 'Referral code not found', 404);
      return;
    }
    if (codeDoc.userId === refereeId) {
      errorResponse(res, 'SELF_REFERRAL', 'Cannot refer yourself', 400);
      return;
    }

    const settings = await WalletLoyaltySetting.findOne({ restaurantId: req.tenantId }).lean();

    const referral = await ReferralCustomer.create({
      restaurantId: req.tenantId,
      referralCode,
      referrerId: codeDoc.userId,
      refereeId,
      referBy: codeDoc.userId,
      refByEarningAmount: settings?.customerReferredDiscountAmount ?? 0,
      customerDiscountAmount: settings?.customerReferredDiscountAmount ?? 0,
      customerDiscountAmountType: settings?.customerReferredDiscountType ?? 'percentage',
      customerDiscountValidity: settings?.customerReferredValidityValue ?? 30,
      customerDiscountValidityType: settings?.customerReferredValidityType ?? 'day',
    });
    successResponse(res, referral, 201);
  },

  // GET /referrals — history
  async list(req: Request, res: Response): Promise<void> {
    const userId = req.auth!.sub;
    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const filter = { restaurantId: req.tenantId, referrerId: userId };
    const [items, total] = await Promise.all([
      ReferralCustomer.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      ReferralCustomer.countDocuments(filter),
    ]);
    successResponse(res, items, 200, { page: Number(page), limit: Number(limit), total });
  },

  // GET /referrals/:id
  async getOne(req: Request, res: Response): Promise<void> {
    const referral = await ReferralCustomer.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    }).lean();
    if (!referral) { errorResponse(res, 'NOT_FOUND', 'Referral not found', 404); return; }
    successResponse(res, referral);
  },

  // POST /referrals/:id/reward — apply reward once qualifying condition is met
  async reward(req: Request, res: Response): Promise<void> {
    const referral = await ReferralCustomer.findOne({
      _id: req.params.id,
      restaurantId: req.tenantId,
    });
    if (!referral) { errorResponse(res, 'NOT_FOUND', 'Referral not found', 404); return; }
    // Idempotency: already rewarded
    if (referral.isUsedByRefer) {
      successResponse(res, referral);
      return;
    }

    await withTransaction(async (session) => {
      // Credit referrer's wallet
      await creditWallet(
        req.tenantId!,
        referral.referrerId,
        referral.refByEarningAmount,
        'credit',
        `referral:${referral._id}`,
        session,
      );
      referral.isUsedByRefer = true;
      await referral.save({ session });
    });

    successResponse(res, referral);
  },
};
