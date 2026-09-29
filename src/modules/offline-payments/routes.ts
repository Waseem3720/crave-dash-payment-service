import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { offlinePaymentController } from './controller';

const router = Router();

// Offline payment methods (public list for checkout, admin CRUD)
router.get(
  '/offline-payment-methods',
  authenticate(false),
  tenantScope,
  offlinePaymentController.listMethods,
);
router.post(
  '/offline-payment-methods',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'create'),
  offlinePaymentController.createMethod,
);
router.put(
  '/offline-payment-methods/:id',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'update'),
  offlinePaymentController.updateMethod,
);
router.delete(
  '/offline-payment-methods/:id',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'delete'),
  offlinePaymentController.deleteMethod,
);

// Offline payment submissions
router.post(
  '/offline-payments',
  authenticate(),
  tenantScope,
  offlinePaymentController.submitOfflinePayment,
);
router.get(
  '/offline-payments',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'read'),
  offlinePaymentController.listOfflinePayments,
);
router.patch(
  '/offline-payments/:id/verify',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'update'),
  offlinePaymentController.verifyOfflinePayment,
);

export default router;
