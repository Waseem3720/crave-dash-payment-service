import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { tenantScope } from '../../middleware/tenant.middleware';
import { referralsController } from './controller';

const router = Router();

router.get('/referrals/code', authenticate(), tenantScope, referralsController.getCode);
router.post('/referrals', authenticate(), tenantScope, referralsController.create);
router.get('/referrals', authenticate(), tenantScope, referralsController.list);
router.get('/referrals/:id', authenticate(), tenantScope, referralsController.getOne);
router.post('/referrals/:id/reward', authenticate(), tenantScope, referralsController.reward);

export default router;
