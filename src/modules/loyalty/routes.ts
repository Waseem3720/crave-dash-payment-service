import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { loyaltyController } from './controller';

const router = Router();

// Service-to-service earn trigger (O-8) — Order Service calls this on order
// completion. Accepts an internal API key OR a service JWT, not customer bearer.
router.post('/loyalty/order-completion', authenticate(), tenantScope, loyaltyController.orderCompletion);

router.get('/loyalty/points', authenticate(), tenantScope, loyaltyController.getBalance);
router.post('/loyalty/points/earn', authenticate(), tenantScope, loyaltyController.earn);
router.post('/loyalty/points/deduct', authenticate(), tenantScope, loyaltyController.deduct);
router.post('/loyalty/points/convert', authenticate(), tenantScope, loyaltyController.convert);
router.get('/loyalty/transactions', authenticate(), tenantScope, loyaltyController.listTransactions);

// Admin reads/ops for a customer (readme2.md §8) — permission-gated
router.get('/loyalty/admin/:userId', authenticate(), tenantScope, requirePermission('user_management', 'read'), loyaltyController.adminGetLoyalty);
router.post('/loyalty/admin/:userId/redeem', authenticate(), tenantScope, requirePermission('user_management', 'update'), loyaltyController.adminRedeem);

export default router;
