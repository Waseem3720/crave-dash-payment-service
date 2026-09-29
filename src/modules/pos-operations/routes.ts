import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { posOperationsController } from './controller';

const router = Router();

router.post('/pos/orders', authenticate(), tenantScope, requirePermission('pos', 'create'), posOperationsController.createPosOrder);
router.post('/pos/payments', authenticate(), tenantScope, requirePermission('pos', 'create'), posOperationsController.posPayment);
router.post('/pos/discounts', authenticate(), tenantScope, requirePermission('pos', 'create'), posOperationsController.posDiscount);
router.post('/pos/open-price', authenticate(), tenantScope, requirePermission('pos', 'create'), posOperationsController.posOpenPrice);
router.post('/pos/void', authenticate(), tenantScope, requirePermission('pos', 'create'), posOperationsController.posVoid);
router.post('/pos/refund', authenticate(), tenantScope, requirePermission('pos', 'create'), posOperationsController.posRefund);
router.post('/pos/login', authenticate(), tenantScope, posOperationsController.posLogin);
router.post('/pos/logout', authenticate(), tenantScope, posOperationsController.posLogout);
router.get('/pos-activity', authenticate(), tenantScope, requirePermission('pos', 'read'), posOperationsController.listActivity);

export default router;
