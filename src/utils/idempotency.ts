import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a new idempotency key (UUID v4).
 */
export function generateIdempotencyKey(): string {
  return uuidv4();
}

/**
 * An in-memory store for idempotency keys (replace with Redis/DB in production).
 * Maps key -> serialised response.
 */
const store = new Map<string, { status: number; body: unknown }>();

export function getIdempotentResponse(key: string): { status: number; body: unknown } | undefined {
  return store.get(key);
}

export function setIdempotentResponse(key: string, status: number, body: unknown): void {
  store.set(key, { status, body });
}
