import mongoose, { Document, Schema } from 'mongoose';

export interface IWalletLoyaltySetting extends Document {
  restaurantId: string; // Added per §3.20 — per-restaurant, not SaaS-wide singleton
  walletStatus: boolean;
  loyaltyPointStatus: boolean;
  refEarningStatus: boolean;
  loyaltyPointExchangeRate: number; // points → currency conversion rate
  loyaltyPointMinimumPoint: number; // minimum points required to convert
  pointPerCurrency: number; // points earned per 1 currency unit spent
  /** Max share of an order payable by wallet, percent 0-100 (O-22 — restaurant-controlled cap) */
  walletMaxSharePercent: number;
  /** Loyalty earn threshold: minimum order amount to earn points (O-20) */
  loyaltyEarnThreshold: number;
  /** Points awarded when an order meets the earn threshold (O-20) */
  loyaltyEarnPoints: number;
  customerReferredDiscountStatus: boolean;
  customerReferredDiscountType: 'percentage' | 'fixed';
  customerReferredDiscountAmount: number;
  customerReferredValidityType: 'day' | 'month' | 'year';
  customerReferredValidityValue: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletLoyaltySettingSchema = new Schema<IWalletLoyaltySetting>(
  {
    restaurantId: { type: String, required: true, unique: true, index: true },
    walletStatus: { type: Boolean, default: true },
    loyaltyPointStatus: { type: Boolean, default: true },
    refEarningStatus: { type: Boolean, default: true },
    loyaltyPointExchangeRate: { type: Number, default: 1 },
    loyaltyPointMinimumPoint: { type: Number, default: 0 },
    pointPerCurrency: { type: Number, default: 1 },
    walletMaxSharePercent: { type: Number, default: 95, min: 0, max: 100 },
    loyaltyEarnThreshold: { type: Number, default: 50 },
    loyaltyEarnPoints: { type: Number, default: 10 },
    customerReferredDiscountStatus: { type: Boolean, default: false },
    customerReferredDiscountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    customerReferredDiscountAmount: { type: Number, default: 0 },
    customerReferredValidityType: { type: String, enum: ['day', 'month', 'year'], default: 'day' },
    customerReferredValidityValue: { type: Number, default: 30 },
  },
  { timestamps: true },
);

export const WalletLoyaltySetting = mongoose.model<IWalletLoyaltySetting>(
  'wallet_loyalty_settings',
  WalletLoyaltySettingSchema,
);
