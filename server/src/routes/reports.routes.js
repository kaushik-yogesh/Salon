import express from 'express';
import { getDashboardMetrics } from '../controllers/reports.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { dashboardReportSchema } from '../validators/reports.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/dashboard', requirePermission('REPORTS', 'READ'), validate(dashboardReportSchema), getDashboardMetrics);

export default router;
