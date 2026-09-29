import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission, requireRole } from '../../middleware/rbac.middleware';
import { paymentGatewayController } from './controller';

const router = Router();

// Public — aggregated usable payment methods (for checkout)
router.get(
  '/payment-methods',
  authenticate(),
  tenantScope,
  paymentGatewayController.listPaymentMethods,
);

// Per-restaurant gateway config (system_settings permission)
router.get(
  '/payment-gateways',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'read'),
  paymentGatewayController.list,
);
router.post(
  '/payment-gateways',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'create'),
  paymentGatewayController.create,
);
router.put(
  '/payment-gateways/:id',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'update'),
  paymentGatewayController.update,
);
router.patch(
  '/payment-gateways/:id/status',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'update'),
  paymentGatewayController.updateStatus,
);
router.delete(
  '/payment-gateways/:id',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'delete'),
  paymentGatewayController.remove,
);

// SaaS-wide global config — SAAS_SUPER_ADMIN only
router.get(
  '/payment-gateways/global',
  authenticate(),
  requireRole('SAAS_SUPER_ADMIN'),
  paymentGatewayController.getGlobal,
);
router.put(
  '/payment-gateways/global',
  authenticate(),
  requireRole('SAAS_SUPER_ADMIN'),
  paymentGatewayController.updateGlobal,
);

export default router;
