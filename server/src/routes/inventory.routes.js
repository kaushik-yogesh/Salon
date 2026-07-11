import express from 'express';
import { getInventory, adjustStock } from '../controllers/inventory.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { adjustStockSchema } from '../validators/inventory.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('INVENTORY', 'READ'), getInventory);
router.post('/adjust', requirePermission('INVENTORY', 'UPDATE'), validate(adjustStockSchema), adjustStock);

export default router;
