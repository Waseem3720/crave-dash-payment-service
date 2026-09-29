import mongoose, { Document, Schema } from 'mongoose';

export interface ICashDrawerOperation extends Document {
  restaurantId: string;
  posSessionId: string;
  operationType: 'cash_in' | 'cash_out' | 'no_sale';
  amount: number;
  reason: string;
  performedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CashDrawerOperationSchema = new Schema<ICashDrawerOperation>(
  {
    restaurantId: { type: String, required: true, index: true },
    posSessionId: { type: String, required: true, index: true },
    operationType: { type: String, enum: ['cash_in', 'cash_out', 'no_sale'], required: true },
    amount: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    performedBy: { type: String, required: true },
  },
  { timestamps: true },
);

export const CashDrawerOperation = mongoose.model<ICashDrawerOperation>(
  'cash_drawer_operations',
  CashDrawerOperationSchema,
);
