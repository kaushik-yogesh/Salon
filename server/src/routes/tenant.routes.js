import express from 'express';
import { 
  getTenants, getTenant, createTenant, updateTenant, deleteTenant, markSetupComplete 
} from '../controllers/tenant.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { 
  createTenantSchema, updateTenantSchema, tenantIdSchema 
} from '../validators/tenant.validators.js';

const router = express.Router();

router.use(requireAuth);

// Note: Tenants endpoints usually have cross-cutting security concerns.
// For example, listing ALL tenants is a SUPER_ADMIN action.
router.get('/', requirePermission('TENANTS', 'READ'), getTenants);
router.post('/', requirePermission('TENANTS', 'CREATE'), validate(createTenantSchema), createTenant);

// For specific tenant access, TENANT_ADMIN might read/update their own.
router.get('/:id', requirePermission('TENANTS', 'READ'), validate(tenantIdSchema), getTenant);
router.put('/:id', requirePermission('TENANTS', 'UPDATE'), validate(updateTenantSchema), updateTenant);
router.delete('/:id', requirePermission('TENANTS', 'DELETE'), validate(tenantIdSchema), deleteTenant);

// Setup wizard completion — accessible to the tenant owner directly
router.patch('/:id/setup-complete', markSetupComplete);

export default router;
