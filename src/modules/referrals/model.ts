import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IReferralCustomer extends Document {
  restaurantId: string;
  referralCode: string;        // the referrer's code used
  referrerId: string;          // the customer who owns/shared the code
  refereeId: string;           // the customer who signed up using the code
  referBy: string;             // referrer's userId (denormalised)
  refByEarningAmount: number;
  customerDiscountAmount: number;
  customerDiscountAmountType: 'percentage' | 'fixed';
  customerDiscountValidity: number;
  customerDiscountValidityType: 'day' | 'month' | 'year';
  /** isUsed: referee has used their signup discount */
  isUsed: boolean;
  /** isUsedByRefer: referrer has been credited for this referral */
  isUsedByRefer: boolean;
  isChecked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ReferralCustomerSchema = new Schema<IReferralCustomer>(
  {
    restaurantId: { type: String, required: true, index: true },
    referralCode: { type: String, required: true },
    referrerId: { type: String, required: true },
    refereeId: { type: String, required: true },
    referBy: { type: String, required: true },
    refByEarningAmount: { type: Number, default: 0 },
    customerDiscountAmount: { type: Number, default: 0 },
    customerDiscountAmountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    customerDiscountValidity: { type: Number, default: 30 },
    customerDiscountValidityType: { type: String, enum: ['day', 'month', 'year'], default: 'day' },
    isUsed: { type: Boolean, default: false },
    isUsedByRefer: { type: Boolean, default: false },
    isChecked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const ReferralCustomer = mongoose.model<IReferralCustomer>(
  'referral_customers',
  ReferralCustomerSchema,
);

// Referral codes are stored on the user profile (in Auth/Order service normally)
// We track codes locally per restaurant for lookup
export interface IReferralCode extends Document {
  restaurantId: string;
  userId: string;
  code: string;
  createdAt: Date;
}

const ReferralCodeSchema = new Schema<IReferralCode>(
  {
    restaurantId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    code: { type: String, required: true, unique: true, default: () => uuidv4().slice(0, 8).toUpperCase() },
  },
  { timestamps: true },
);

export const ReferralCode = mongoose.model<IReferralCode>('referral_codes', ReferralCodeSchema);
