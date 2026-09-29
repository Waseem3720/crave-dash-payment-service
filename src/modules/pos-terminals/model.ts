import mongoose, { Document, Schema } from 'mongoose';

export interface IPosTerminal extends Document {
  restaurantId: string;
  branchId: string;
  terminalName: string;
  terminalCode: string;
  isActive: boolean;
  isLocked: boolean;
  lockedAt: Date | null;
  lockedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PosTerminalSchema = new Schema<IPosTerminal>(
  {
    restaurantId: { type: String, required: true, index: true },
    branchId: { type: String, required: true },
    terminalName: { type: String, required: true },
    terminalCode: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    isLocked: { type: Boolean, default: false },
    lockedAt: { type: Date, default: null },
    lockedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const PosTerminal = mongoose.model<IPosTerminal>('pos_terminals', PosTerminalSchema);
