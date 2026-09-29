import mongoose, { Document, Schema } from 'mongoose';

/**
 * deliveryman_wallets — each document is ONE ledger entry.
 * Current balance = running sum of all entries for a deliveryManId.
 * Per §3.19: do not add a separate balance field outside the ledger.
 */
export interface IDeliverymanWallet extends Document {
  restaurantId: string;
  deliveryManId: string;
  amount: number;       // positive = credit, negative = debit
  transactionType: 'credit' | 'debit';
  reference: string;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverymanWalletSchema = new Schema<IDeliverymanWallet>(
  {
    restaurantId: { type: String, required: true, index: true },
    deliveryManId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    transactionType: { type: String, enum: ['credit', 'debit'], required: true },
    reference: { type: String, default: '' },
  },
  { timestamps: true },
);

export const DeliverymanWallet = mongoose.model<IDeliverymanWallet>(
  'deliveryman_wallets',
  DeliverymanWalletSchema,
);
