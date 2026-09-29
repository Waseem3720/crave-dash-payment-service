/**
 * Reporting Service client — audit event emitter (readme2.md §14, appendix #18).
 *
 * Payment Service pushes POS activity, void, refund, discount, cash-drawer and
 * cash-operation events to Reports Service. Fire-and-forget: never blocks the
 * payment flow (money math and transactions are unaffected by audit outages).
 */
import axios from 'axios';

const REPORTS_SERVICE_URL = process.env['REPORTS_SERVICE_URL'] || '';
const INTERNAL_API_KEY = process.env['INTERNAL_API_KEY'] || '';

export interface PaymentAuditEvent {
  restaurantId: string | null;
  actorType: 'user' | 'service' | 'system';
  actorId: string;
  actorRole?: string;
  action: string; // "entity.verb" convention, e.g. "payment.refunded"
  entityType: string;
  entityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  ipAddress?: string;
}

export async function emitAuditEvent(event: PaymentAuditEvent): Promise<void> {
  if (!REPORTS_SERVICE_URL) return; // integration optional in dev
  try {
    await axios.post(
      `${REPORTS_SERVICE_URL}/audit-logs`,
      { ...event, source: 'payment-service' },
      {
        timeout: 4_000,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': INTERNAL_API_KEY,
        },
      },
    );
  } catch (err) {
    console.warn('[AuditClient] Failed to push audit event:', event.action, err instanceof Error ? err.message : err);
  }
}
