import mongoose, { Document, Schema } from 'mongoose';

export interface IPosSession extends Document {
  restaurantId: string;
  branchId: string;
  terminalId: string;
  operatorId: string;
  openingCash: number;
  closingCash: number | null;
  expectedCash: number | null;
  overShort: number | null;
  status: 'open' | 'closed';
  openedAt: Date;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PosSessionSchema = new Schema<IPosSession>(
  {
    restaurantId: { type: String, required: true, index: true },
    branchId: { type: String, required: true },
    terminalId: { type: String, required: true },
    operatorId: { type: String, required: true },
    openingCash: { type: Number, required: true },
    closingCash: { type: Number, default: null },
    expectedCash: { type: Number, default: null },
    overShort: { type: Number, default: null },
    status: { type: String, enum: ['open', 'closed'], default: 'open' },
    openedAt: { type: Date, default: () => new Date() },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const PosSession = mongoose.model<IPosSession>('pos_sessions', PosSessionSchema);
