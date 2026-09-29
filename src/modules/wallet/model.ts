import mongoose, { Document, Schema } from 'mongoose';

// Wallet Accounts — one per user per restaurant
export interface IWalletAccount extends Document {
  restaurantId: string;
  userId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

const WalletAccountSchema = new Schema<IWalletAccount>(
  {
    restaurantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    balance: { type: Number, default: 0 },
  },
  { timestamps: true },
);

WalletAccountSchema.index({ restaurantId: 1, userId: 1 }, { unique: true });

export const WalletAccount = mongoose.model<IWalletAccount>('wallet_accounts', WalletAccountSchema);

// Wallet Transactions
export interface IWalletTransaction extends Document {
  restaurantId: string;
  userId: string;
  walletAccountId: string;
  credit: number;
  debit: number;
  adminBonus: number;
  balance: number; // resulting balance after this transaction
  transactionType: 'topup' | 'bonus' | 'credit' | 'debit' | 'payment' | 'refund' | 'convert';
  reference: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    restaurantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    walletAccountId: { type: String, required: true },
    credit: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    adminBonus: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    transactionType: {
      type: String,
      enum: ['topup', 'bonus', 'credit', 'debit', 'payment', 'refund', 'convert'],
      required: true,
    },
    reference: { type: String, default: '' },
  },
  { timestamps: true },
);

export const WalletTransaction = mongoose.model<IWalletTransaction>(
  'wallet_transactions',
  WalletTransactionSchema,
);

// Wallet Bonus Rules
export interface IWalletBonus extends Document {
  restaurantId: string;
  bonusType: 'percentage' | 'fixed';
  bonusAmount: number;
  minimumAddAmount: number;
  maximumBonusAmount: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const WalletBonusSchema = new Schema<IWalletBonus>(
  {
    restaurantId: { type: String, required: true, index: true },
    bonusType: { type: String, enum: ['percentage', 'fixed'], required: true },
    bonusAmount: { type: Number, required: true },
    minimumAddAmount: { type: Number, default: 0 },
    maximumBonusAmount: { type: Number, default: 0 },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const WalletBonus = mongoose.model<IWalletBonus>('wallet_bonuses', WalletBonusSchema);
