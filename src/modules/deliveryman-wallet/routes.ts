import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { deliverymanWalletController } from './controller';

const router = Router();

router.get('/deliveryman-wallets/:deliveryManId', authenticate(), tenantScope, deliverymanWalletController.getBalance);
router.post('/deliveryman-wallets/:deliveryManId/credit', authenticate(), tenantScope, deliverymanWalletController.credit);
router.post('/deliveryman-wallets/:deliveryManId/debit', authenticate(), tenantScope, deliverymanWalletController.debit);
router.get('/deliveryman-wallets/:deliveryManId/transactions', authenticate(), tenantScope, deliverymanWalletController.listTransactions);

export default router;
