import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { requirePermission } from '../../middleware/rbac.middleware';
import { walletController } from './controller';

const router = Router();

// Customer self-service (no permission check — gated by CUSTOMER role + self-ownership in controller)
router.get('/wallet', authenticate(), tenantScope, walletController.getBalance);
router.post('/wallet/add-funds', authenticate(), tenantScope, walletController.addFunds);
router.get('/wallet/transactions', authenticate(), tenantScope, walletController.listTransactions);
router.get('/wallet/transactions/:id', authenticate(), tenantScope, walletController.getTransaction);

// Admin-triggered (user_management permission, per §2.1)
router.post('/wallet/credit', authenticate(), tenantScope, requirePermission('user_management', 'update'), walletController.credit);
router.post('/wallet/debit', authenticate(), tenantScope, requirePermission('user_management', 'update'), walletController.debit);

// Admin wallet read for a customer (readme2.md §8) — permission-gated
router.get('/wallet/admin/:userId', authenticate(), tenantScope, requirePermission('user_management', 'read'), walletController.adminGetWallet);

// Wallet bonus rules
router.get('/wallet/bonuses', authenticate(false), tenantScope, walletController.listBonuses);
router.post('/wallet/bonuses', authenticate(), tenantScope, requirePermission('system_settings', 'create'), walletController.createBonus);
router.get('/wallet/bonuses/:id', authenticate(), tenantScope, walletController.getBonus);
router.put('/wallet/bonuses/:id', authenticate(), tenantScope, requirePermission('system_settings', 'update'), walletController.updateBonus);
router.patch('/wallet/bonuses/:id/status', authenticate(), tenantScope, requirePermission('system_settings', 'update'), walletController.updateBonusStatus);

export default router;
