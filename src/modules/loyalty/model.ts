import mongoose, { Document, Schema } from 'mongoose';

export interface IPointTransition extends Document {
  restaurantId: string;
  userId: string;
  type: 'earn' | 'deduct' | 'convert';
  amount: number;
  credit: number;
  debit: number;
  balance: number; // resulting balance after this entry
  reference: string;
  /** Present when the earn was triggered by an order completion (idempotency key, O-8) */
  orderId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PointTransitionSchema = new Schema<IPointTransition>(
  {
    restaurantId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    type: { type: String, enum: ['earn', 'deduct', 'convert'], required: true },
    amount: { type: Number, required: true },
    credit: { type: Number, default: 0 },
    debit: { type: Number, default: 0 },
    balance: { type: Number, required: true },
    reference: { type: String, default: '' },
    // Idempotency: one server-side earn per order (O-8 — prevents double-crediting)
    orderId: { type: String, default: null, index: { unique: true, sparse: true } },
  },
  { timestamps: true },
);

export const PointTransition = mongoose.model<IPointTransition>(
  'point_transitions',
  PointTransitionSchema,
);
