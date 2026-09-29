import mongoose, { Document, Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ─── Core Payments ──────────────────────────────────────────────────────────
export interface IPayment extends Document {
  restaurantId: string;
  orderId: string;
  userId: string | null;
  amount: number;
  currency: string;
  method: string;
  gateway: string | null;
  status: 'pending' | 'confirmed' | 'failed' | 'refunded' | 'partially_refunded';
  transactionId: string;
  gatewayReference: string | null;
  paymentRequestId: string | null;
  allocations?: Array<{ method: string; amount: number; gatewayReference?: string }>;
  confirmedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    restaurantId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    userId: { type: String, default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    method: { type: String, required: true },
    gateway: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'confirmed', 'failed', 'refunded', 'partially_refunded'],
      default: 'pending',
    },
    transactionId: { type: String, default: () => uuidv4() },
    gatewayReference: { type: String, default: null },
    paymentRequestId: { type: String, default: null },
    allocations: [
      {
        method: String,
        amount: Number,
        gatewayReference: String,
      },
    ],
    confirmedAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export const Payment = mongoose.model<IPayment>('payments', PaymentSchema);

// ─── Partial Payments ────────────────────────────────────────────────────────
export interface IPaymentPartialPayment extends Document {
  restaurantId: string;
  orderId: string;
  paymentRequestId: string | null;
  paidAmount: number;
  dueAmount: number;
  paidWith: string;
  paymentStatus: 'pending' | 'partial' | 'paid';
  createdAt: Date;
  updatedAt: Date;
}

const PaymentPartialPaymentSchema = new Schema<IPaymentPartialPayment>(
  {
    restaurantId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    paymentRequestId: { type: String, default: null },
    paidAmount: { type: Number, required: true },
    dueAmount: { type: Number, required: true },
    paidWith: { type: String, required: true },
    paymentStatus: { type: String, enum: ['pending', 'partial', 'paid'], default: 'partial' },
  },
  { timestamps: true },
);

export const PaymentPartialPayment = mongoose.model<IPaymentPartialPayment>(
  'payment_partial_payments',
  PaymentPartialPaymentSchema,
);

// ─── Payment Requests (Gateway Checkout Flow) ────────────────────────────────
export interface IPaymentRequest extends Document {
  restaurantId: string;
  attributeId: string;
  attribute: string;
  paymentPlatform: string;
  amount: number;
  currency: string;
  gatewayCallbackUrl: string;
  /** Hosted PSP checkout page the browser should open (Frontend_with_no_images.md §5.4) */
  checkoutUrl?: string;
  successHook: string;
  failureHook: string;
  isPaid: boolean;
  status: 'pending' | 'success' | 'failure';
  gatewayResponse: Record<string, unknown>;
  idempotencyKey: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRequestSchema = new Schema<IPaymentRequest>(
  {
    restaurantId: { type: String, required: true, index: true },
    attributeId: { type: String, required: true },
    attribute: { type: String, required: true },
    paymentPlatform: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    gatewayCallbackUrl: { type: String, default: '' },
    checkoutUrl: { type: String, default: '' },
    successHook: { type: String, default: '' },
    failureHook: { type: String, default: '' },
    isPaid: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'success', 'failure'], default: 'pending' },
    gatewayResponse: { type: Schema.Types.Mixed, default: {} },
    idempotencyKey: { type: String, default: () => uuidv4(), unique: true },
  },
  { timestamps: true },
);

export const PaymentRequest = mongoose.model<IPaymentRequest>(
  'payment_requests',
  PaymentRequestSchema,
);

// ─── Refunds ─────────────────────────────────────────────────────────────────
export interface IPaymentRefund extends Document {
  restaurantId: string;
  orderId: string;
  paymentId: string;
  paymentRequestId: string | null;
  transactionId: string;
  refundAmount: number;
  refundStatus: 'pending' | 'processing' | 'completed' | 'failed';
  refundReference: string;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentRefundSchema = new Schema<IPaymentRefund>(
  {
    restaurantId: { type: String, required: true, index: true },
    orderId: { type: String, required: true },
    paymentId: { type: String, required: true },
    paymentRequestId: { type: String, default: null },
    transactionId: { type: String, default: () => uuidv4() },
    refundAmount: { type: Number, required: true },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    refundReference: { type: String, default: '' },
    reason: { type: String, default: '' },
  },
  { timestamps: true },
);

export const PaymentRefund = mongoose.model<IPaymentRefund>('payment_refunds', PaymentRefundSchema);

// ─── Order Transactions (COD deliveryman cash-collection reconciliation) ────
export interface IOrderTransaction extends Document {
  restaurantId: string;
  orderId: string;
  deliveryManId: string;
  orderAmount: number;
  receivedBy: string;
  deliveryCharge: number;
  originalDeliveryCharge: number;
  tax: number;
  createdAt: Date;
  updatedAt: Date;
}

const OrderTransactionSchema = new Schema<IOrderTransaction>(
  {
    restaurantId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, index: true },
    deliveryManId: { type: String, required: true },
    orderAmount: { type: Number, required: true },
    receivedBy: { type: String, required: true },
    deliveryCharge: { type: Number, default: 0 },
    originalDeliveryCharge: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export const OrderTransaction = mongoose.model<IOrderTransaction>(
  'order_transactions',
  OrderTransactionSchema,
);
