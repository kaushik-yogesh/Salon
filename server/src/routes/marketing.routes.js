import express from 'express';
import { sendCampaign } from '../controllers/marketing.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.post('/campaign', requirePermission('MARKETING', 'CREATE'), sendCampaign);

export default router;
