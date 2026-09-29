import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { posSessionsController } from './controller';

const router = Router();

router.post('/pos-sessions', authenticate(), tenantScope, requirePermission('pos', 'create'), posSessionsController.open);
router.get('/pos-sessions', authenticate(), tenantScope, requirePermission('pos', 'read'), posSessionsController.list);
router.get('/pos-sessions/:id', authenticate(), tenantScope, requirePermission('pos', 'read'), posSessionsController.getOne);
router.post('/pos-sessions/:id/close', authenticate(), tenantScope, requirePermission('pos', 'update'), posSessionsController.close);
router.get('/pos-sessions/:id/balance', authenticate(), tenantScope, requirePermission('pos', 'read'), posSessionsController.getBalance);
router.get('/pos-sessions/:id/operations', authenticate(), tenantScope, requirePermission('pos', 'read'), posSessionsController.getOperations);
router.get('/pos-sessions/:id/z-report', authenticate(), tenantScope, requirePermission('pos', 'read'), posSessionsController.getZReport);

export default router;
