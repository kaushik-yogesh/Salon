import express from 'express';
import { getRoles, createRole, updateRole, deleteRole } from '../controllers/role.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createRoleSchema, updateRoleSchema, roleIdSchema } from '../validators/role.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('ROLES', 'READ'), getRoles);
router.post('/', requirePermission('ROLES', 'CREATE'), validate(createRoleSchema), createRole);
router.put('/:id', requirePermission('ROLES', 'UPDATE'), validate(updateRoleSchema), updateRole);
router.delete('/:id', requirePermission('ROLES', 'DELETE'), validate(roleIdSchema), deleteRole);

export default router;
