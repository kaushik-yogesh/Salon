import express from 'express';
import { getDashboardMetrics, getAdminDashboardMetrics, getSystemHealth } from '../controllers/dashboard.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);

// Admin route (must be before tenant context if it doesn't need tenant context, though our middleware sets it anyway)
router.get('/admin-metrics', getAdminDashboardMetrics);
router.get('/health/config', getSystemHealth);

router.use(requireTenantContext);

router.get('/metrics', requirePermission('DASHBOARD', 'READ'), getDashboardMetrics);

export default router;
