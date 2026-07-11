import express from 'express';
import { getCatalog, createService, createCategory } from '../controllers/catalog.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('CATALOG', 'READ'), getCatalog);
router.post('/categories', requirePermission('CATALOG', 'CREATE'), createCategory);
router.post('/services', requirePermission('CATALOG', 'CREATE'), createService);

export default router;
