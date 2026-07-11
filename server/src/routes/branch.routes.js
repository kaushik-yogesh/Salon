import express from 'express';
import { 
  getBranches, getBranch, createBranch, updateBranch, deleteBranch 
} from '../controllers/branch.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { 
  createBranchSchema, updateBranchSchema, branchIdSchema 
} from '../validators/branch.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('BRANCHES', 'READ'), getBranches);
router.post('/', requirePermission('BRANCHES', 'CREATE'), validate(createBranchSchema), createBranch);

router.get('/:id', requirePermission('BRANCHES', 'READ'), validate(branchIdSchema), getBranch);
router.put('/:id', requirePermission('BRANCHES', 'UPDATE'), validate(updateBranchSchema), updateBranch);
router.delete('/:id', requirePermission('BRANCHES', 'DELETE'), validate(branchIdSchema), deleteBranch);

export default router;
