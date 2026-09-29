import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { cashDrawerController } from './controller';

const router = Router();

router.get('/cash-drawer', authenticate(), tenantScope, requirePermission('pos', 'read'), cashDrawerController.getDrawer);
router.post('/cash-in', authenticate(), tenantScope, requirePermission('pos', 'create'), cashDrawerController.cashIn);
router.post('/cash-out', authenticate(), tenantScope, requirePermission('pos', 'create'), cashDrawerController.cashOut);
router.post('/no-sale', authenticate(), tenantScope, requirePermission('pos', 'create'), cashDrawerController.noSale);
router.get('/cash-operations', authenticate(), tenantScope, requirePermission('pos', 'read'), cashDrawerController.listOperations);

export default router;
