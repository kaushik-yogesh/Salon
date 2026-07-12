import express from 'express';
import { getInventory, adjustStock, createProduct, getSuppliers, createSupplier } from '../controllers/inventory.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { adjustStockSchema, createProductSchema } from '../validators/inventory.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('INVENTORY', 'READ'), getInventory);
router.post('/', requirePermission('INVENTORY', 'CREATE'), validate(createProductSchema), createProduct);
router.post('/adjust', requirePermission('INVENTORY', 'UPDATE'), validate(adjustStockSchema), adjustStock);

router.get('/suppliers', requirePermission('INVENTORY', 'READ'), getSuppliers);
router.post('/suppliers', requirePermission('INVENTORY', 'CREATE'), createSupplier);

export default router;
