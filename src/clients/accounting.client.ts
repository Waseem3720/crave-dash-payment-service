/**
 * Accounting Service client — wallet top-up journal entry (readme2.md §14, appendix #19).
 *
 * Wallet top-ups are typically charged via the card gateway (no cash moves until
 * payout), so this journal is OPTIONAL and disabled by default. Enable with
 * WALLET_TOPUP_JOURNAL=true when top-ups are settled as real cash at the counter.
 */
import axios from 'axios';

const ACCOUNTING_SERVICE_URL = process.env['ACCOUNTING_SERVICE_URL'] || '';
const INTERNAL_API_KEY = process.env['INTERNAL_API_KEY'] || '';
const WALLET_TOPUP_JOURNAL = process.env['WALLET_TOPUP_JOURNAL'] === 'true';

export async function postWalletTopupJournal(
  restaurantId: string,
  userId: string,
  amount: number,
): Promise<void> {
  if (!ACCOUNTING_SERVICE_URL || !WALLET_TOPUP_JOURNAL || amount <= 0) return;
  try {
    await axios.post(
      `${ACCOUNTING_SERVICE_URL}/journal-entries`,
      {
        restaurantId,
        entryDate: new Date(),
        referenceType: 'wallet_topup',
        referenceId: `${userId}:${Date.now()}`,
        description: `Wallet top-up — user ${userId}`,
        lines: [
          { accountCode: '1000', debit: amount, credit: 0 }, // cash on hand
          { accountCode: '2100', debit: 0, credit: amount }, // customer wallet liability
        ],
        idempotencyKey: `wallet_topup:${userId}:${Date.now()}`,
      },
      {
        timeout: 5_000,
        headers: {
          'Content-Type': 'application/json',
          'x-internal-api-key': INTERNAL_API_KEY,
        },
      },
    );
  } catch (err) {
    console.warn('[AccountingClient] wallet_topup journal failed:', err instanceof Error ? err.message : err);
  }
}
