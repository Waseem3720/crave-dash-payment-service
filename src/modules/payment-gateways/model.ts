import mongoose, { Document, Schema } from 'mongoose';

// Per-restaurant gateway config
export interface IPaymentGatewayConfig extends Document {
  restaurantId: string;
  keyName: string;
  liveValues: Record<string, string>;
  testValues: Record<string, string>;
  mode: 'live' | 'test';
  isActive: boolean;
  additionalData?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentGatewayConfigSchema = new Schema<IPaymentGatewayConfig>(
  {
    restaurantId: { type: String, required: true, index: true },
    keyName: { type: String, required: true },
    liveValues: { type: Map, of: String, default: {} },
    testValues: { type: Map, of: String, default: {} },
    mode: { type: String, enum: ['live', 'test'], default: 'test' },
    isActive: { type: Boolean, default: true },
    additionalData: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export const PaymentGatewayConfig = mongoose.model<IPaymentGatewayConfig>(
  'payment_gateway_configs',
  PaymentGatewayConfigSchema,
);

// SaaS-wide global defaults (singleton, no restaurantId)
export interface IPaymentGatewayConfigGlobal extends Document {
  sslCommerzPayment: Record<string, unknown>;
  paypal: Record<string, unknown>;
  stripe: Record<string, unknown>;
  razorPay: Record<string, unknown>;
  senangPay: Record<string, unknown>;
  paystack: Record<string, unknown>;
  bkash: Record<string, unknown>;
  paymob: Record<string, unknown>;
  flutterwave: Record<string, unknown>;
  mercadopago: Record<string, unknown>;
  cashOnDelivery: Record<string, unknown>;
  digitalPayment: Record<string, unknown>;
  offlinePayment: Record<string, unknown>;
  updatedAt: Date;
}

const PaymentGatewayConfigGlobalSchema = new Schema<IPaymentGatewayConfigGlobal>(
  {
    sslCommerzPayment: { type: Schema.Types.Mixed, default: {} },
    paypal: { type: Schema.Types.Mixed, default: {} },
    stripe: { type: Schema.Types.Mixed, default: {} },
    razorPay: { type: Schema.Types.Mixed, default: {} },
    senangPay: { type: Schema.Types.Mixed, default: {} },
    paystack: { type: Schema.Types.Mixed, default: {} },
    bkash: { type: Schema.Types.Mixed, default: {} },
    paymob: { type: Schema.Types.Mixed, default: {} },
    flutterwave: { type: Schema.Types.Mixed, default: {} },
    mercadopago: { type: Schema.Types.Mixed, default: {} },
    cashOnDelivery: { type: Schema.Types.Mixed, default: {} },
    digitalPayment: { type: Schema.Types.Mixed, default: {} },
    offlinePayment: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export const PaymentGatewayConfigGlobal = mongoose.model<IPaymentGatewayConfigGlobal>(
  'payment_gateway_configs_global',
  PaymentGatewayConfigGlobalSchema,
);
