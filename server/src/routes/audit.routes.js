import express from 'express';
import { getAuditLogs } from '../controllers/audit.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

// Requires highly privileged AUDIT READ access
router.get('/', requirePermission('AUDIT', 'READ'), getAuditLogs);

export default router;
