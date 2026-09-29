import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { pciGuard } from '../../middleware/pci.middleware';
import { paymentsController } from './controller';

const router = Router();

// ─── Core Payments ────────────────────────────────────────────────────────────
router.post('/payments', authenticate(), tenantScope, pciGuard, paymentsController.create);
router.get('/payments', authenticate(), tenantScope, paymentsController.list);
router.get('/payments/order/:orderId', authenticate(), tenantScope, paymentsController.getByOrderId);
router.get('/payments/:id', authenticate(), tenantScope, paymentsController.getOne);
router.get('/payments/:id/status', authenticate(), tenantScope, paymentsController.getStatus);
router.get('/payments/:id/transactions', authenticate(), tenantScope, paymentsController.getTransactions);
router.get('/payments/:id/allocation', authenticate(), tenantScope, paymentsController.getAllocation);
router.post('/payments/:id/verify', authenticate(), tenantScope, paymentsController.verify);
router.post('/payments/:id/confirm', authenticate(), tenantScope, paymentsController.confirm);
router.post('/payments/:id/fail', authenticate(), tenantScope, paymentsController.fail);
router.post('/payments/:id/refund', authenticate(), tenantScope, paymentsController.refund);

// ─── Special Payment Types ────────────────────────────────────────────────────
router.post('/payments/partial', authenticate(), tenantScope, paymentsController.createPartial);
router.post('/payments/combined', authenticate(), tenantScope, pciGuard, paymentsController.createCombined);
router.post('/payments/cash', authenticate(), tenantScope, paymentsController.processCash);
router.post('/payments/cod', authenticate(), tenantScope, paymentsController.processCod);
router.post('/payments/offline', authenticate(), tenantScope, paymentsController.processOffline);

// ─── Payment Requests (Gateway Checkout Flow) ─────────────────────────────────
router.post('/payment-requests', authenticate(), tenantScope, pciGuard, paymentsController.createPaymentRequest);
router.get('/payment-requests/:id', authenticate(), tenantScope, paymentsController.getPaymentRequest);
router.post('/payment-requests/:id/success', paymentsController.paymentRequestSuccess); // gateway callback — no auth
router.post('/payment-requests/:id/failure', paymentsController.paymentRequestFailure); // gateway callback — no auth

// ─── Reconciliation & Transactions ───────────────────────────────────────────
router.get('/reconciliation/orders/:orderId', authenticate(), tenantScope, paymentsController.reconcileOrder);
router.get('/transactions', authenticate(), tenantScope, paymentsController.listTransactions);
router.get('/transactions/:id', authenticate(), tenantScope, paymentsController.getTransaction);

// ─── Order Transactions (COD deliveryman cash-collection) ─────────────────────
router.post('/order-transactions', authenticate(), tenantScope, paymentsController.createOrderTransaction);

export default router;
