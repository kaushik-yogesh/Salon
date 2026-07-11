import express from 'express';
import { createExpense, getExpenses, updateExpenseStatus } from '../controllers/expense.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createExpenseSchema, updateExpenseStatusSchema } from '../validators/expense.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('FINANCE', 'READ'), getExpenses);
router.post('/', requirePermission('FINANCE', 'CREATE'), validate(createExpenseSchema), createExpense);
router.patch('/:id/status', requirePermission('FINANCE', 'UPDATE'), validate(updateExpenseStatusSchema), updateExpenseStatus);

export default router;
