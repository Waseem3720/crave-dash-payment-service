import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { posTerminalsController } from './controller';

const router = Router();

router.post('/pos-terminals', authenticate(), tenantScope, requirePermission('pos', 'create'), posTerminalsController.create);
router.get('/pos-terminals', authenticate(), tenantScope, requirePermission('pos', 'read'), posTerminalsController.list);
router.get('/pos-terminals/:id', authenticate(), tenantScope, requirePermission('pos', 'read'), posTerminalsController.getOne);
router.put('/pos-terminals/:id', authenticate(), tenantScope, requirePermission('pos', 'update'), posTerminalsController.update);
router.patch('/pos-terminals/:id/status', authenticate(), tenantScope, requirePermission('pos', 'update'), posTerminalsController.updateStatus);
router.delete('/pos-terminals/:id', authenticate(), tenantScope, requirePermission('pos', 'delete'), posTerminalsController.remove);
router.patch('/pos-terminals/:id/lock', authenticate(), tenantScope, requirePermission('pos', 'update'), posTerminalsController.lock);
router.patch('/pos-terminals/:id/unlock', authenticate(), tenantScope, requirePermission('pos', 'update'), posTerminalsController.unlock);

export default router;
