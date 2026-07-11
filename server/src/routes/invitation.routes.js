import express from 'express';
import { inviteUser, getInvitations } from '../controllers/invitation.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.post('/', requirePermission('USERS', 'CREATE'), inviteUser);
router.get('/', requirePermission('USERS', 'READ'), getInvitations);

export default router;
