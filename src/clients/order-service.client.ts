import axios, { AxiosInstance, AxiosError } from 'axios';
import { config } from '../config';

/**
 * Order Service client — service-to-service, key-authenticated (readme2.md §5.2).
 *
 * Used to push payment results to Order Service:
 *   PATCH /orders/:id/payment-status  { paymentStatus, transactionReference, ... }
 *
 * Auth: `x-internal-api-key` header (shared INTERNAL_API_KEY). Order also
 * accepts a user JWT, but service calls are key-based.
 *
 * Retry: up to 3 attempts on network errors / 5xx / 429, exponential backoff
 * (250ms → 500ms → 1s). 4xx responses are NOT retried (permanent).
 */

const client: AxiosInstance = axios.create({
  baseURL: config.services.order,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    'x-internal-api-key': config.internalServiceApiKey,
  },
});

function isRetryable(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    if (!err.response) return true; // network error / timeout
    const s = err.response.status;
    return s >= 500 || s === 429;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetryable(err)) break;
      const delay = 250 * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  const status = axios.isAxiosError(lastErr) ? (lastErr as AxiosError).response?.status : undefined;
  console.error(`[order-client] ${label} failed after retries`, {
    url: (lastErr as AxiosError)?.config?.url,
    status,
    message: lastErr instanceof Error ? lastErr.message : lastErr,
  });
  throw lastErr;
}

export const orderServiceClient = {
  /**
   * Push a payment result to Order Service. Idempotent on Order side
   * (terminal paymentStatus states are guarded there).
   */
  async notifyPaymentStatus(
    orderId: string,
    update: {
      paymentStatus: 'pending' | 'paid' | 'partial' | 'failed' | 'refunded';
      transactionReference?: string;
      paymentId?: string;
      refundAmount?: number;
      reason?: string;
      refundReference?: string;
    },
  ): Promise<void> {
    await withRetry(
      () => client.patch(`/orders/${orderId}/payment-status`, update),
      `notifyPaymentStatus(${orderId}, ${update.paymentStatus})`,
    );
  },

  /** Fetch an order by ID (used for validation / partial-payment amounts). */
  async getOrder(orderId: string, token?: string) {
    const { data } = await client.get(`/orders/${orderId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data;
  },

  /** Create an order (POS orchestration endpoint). */
  async createOrder(orderPayload: Record<string, unknown>, token?: string) {
    const { data } = await client.post('/orders', orderPayload, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return data;
  },
};
