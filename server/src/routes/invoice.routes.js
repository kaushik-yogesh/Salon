import express from 'express';
import { getAllInvoices, voidInvoice } from '../controllers/invoice.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('POS', 'READ'), getAllInvoices);
router.delete('/:id', requirePermission('POS', 'DELETE'), voidInvoice);

export default router;
