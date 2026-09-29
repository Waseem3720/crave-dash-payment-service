import mongoose, { Document, Schema } from 'mongoose';

export interface IOfflinePaymentMethod extends Document {
  restaurantId: string;
  methodName: string;
  methodFields: Array<{ fieldName: string; fieldType: string; required: boolean }>;
  paymentNote: string;
  methodInformations: string;
  status: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const OfflinePaymentMethodSchema = new Schema<IOfflinePaymentMethod>(
  {
    restaurantId: { type: String, required: true, index: true },
    methodName: { type: String, required: true },
    methodFields: [
      {
        fieldName: String,
        fieldType: String,
        required: { type: Boolean, default: false },
      },
    ],
    paymentNote: { type: String, default: '' },
    methodInformations: { type: String, default: '' },
    status: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const OfflinePaymentMethod = mongoose.model<IOfflinePaymentMethod>(
  'offline_payment_methods',
  OfflinePaymentMethodSchema,
);

// Customer's submission against an offline payment method
export interface IOfflinePayment extends Document {
  restaurantId: string;
  orderId: string;
  methodId: string;
  paymentInfo: Record<string, unknown>;
  status: 'pending' | 'verified' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const OfflinePaymentSchema = new Schema<IOfflinePayment>(
  {
    restaurantId: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    methodId: { type: String, required: true },
    paymentInfo: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  },
  { timestamps: true },
);

export const OfflinePayment = mongoose.model<IOfflinePayment>(
  'offline_payments',
  OfflinePaymentSchema,
);
