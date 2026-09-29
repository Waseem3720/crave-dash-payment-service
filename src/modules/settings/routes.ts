import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { settingsController } from './controller';

const router = Router();

// Storefront reads business rules with a customer bearer token (O-20).
// optionalAuthenticate attaches the customer identity when present; the response
// is the same for everyone — only PUT is restricted to system_settings admins.
router.get('/settings', authenticate(false), tenantScope, settingsController.get);
router.put(
  '/settings',
  authenticate(),
  tenantScope,
  requirePermission('system_settings', 'update'),
  settingsController.update,
);

export default router;
