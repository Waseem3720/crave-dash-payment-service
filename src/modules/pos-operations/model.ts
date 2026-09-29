import mongoose, { Document, Schema } from 'mongoose';

// Void/Refund logs
export interface IPosVoidRefundLog extends Document {
  restaurantId: string;
  posSessionId: string;
  orderId: string;
  action: 'void' | 'refund';
  amount: number;
  reason: string;
  approvedBy: string | null;
  performedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const PosVoidRefundLogSchema = new Schema<IPosVoidRefundLog>(
  {
    restaurantId: { type: String, required: true, index: true },
    posSessionId: { type: String, required: true },
    orderId: { type: String, required: true },
    action: { type: String, enum: ['void', 'refund'], required: true },
    amount: { type: Number, required: true },
    reason: { type: String, default: '' },
    approvedBy: { type: String, default: null },
    performedBy: { type: String, required: true },
  },
  { timestamps: true },
);

export const PosVoidRefundLog = mongoose.model<IPosVoidRefundLog>(
  'pos_void_refund_logs',
  PosVoidRefundLogSchema,
);

// POS Activity Log (lightweight append-only audit feed)
export interface IPosActivityLog extends Document {
  restaurantId: string;
  branchId: string;
  terminalId: string;
  userId: string;
  action: 'login' | 'logout';
  createdAt: Date;
}

const PosActivityLogSchema = new Schema<IPosActivityLog>(
  {
    restaurantId: { type: String, required: true, index: true },
    branchId: { type: String, default: '' },
    terminalId: { type: String, default: '' },
    userId: { type: String, required: true },
    action: { type: String, enum: ['login', 'logout'], required: true },
  },
  { timestamps: true },
);

export const PosActivityLog = mongoose.model<IPosActivityLog>(
  'pos_activity_logs',
  PosActivityLogSchema,
);
