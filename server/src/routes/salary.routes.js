import express from 'express';
import { generateSalaryRun, getSalaryRuns } from '../controllers/salary.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { generateSalarySchema } from '../validators/salary.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('FINANCE', 'READ'), getSalaryRuns);
router.post('/generate', requirePermission('FINANCE', 'CREATE'), validate(generateSalarySchema), generateSalaryRun);

export default router;
