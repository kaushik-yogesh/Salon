import express from 'express';
import { 
  getUsers, getUser, updateUserStatus, updateUserProfile, deleteUser 
} from '../controllers/user.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { 
  updateUserStatusSchema, updateUserProfileSchema, userIdSchema 
} from '../validators/user.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('USERS', 'READ'), getUsers);
router.get('/:id', requirePermission('USERS', 'READ'), validate(userIdSchema), getUser);

router.put('/:id/status', requirePermission('USERS', 'UPDATE'), validate(updateUserStatusSchema), updateUserStatus);
router.put('/:id/profile', requirePermission('USERS', 'UPDATE'), validate(updateUserProfileSchema), updateUserProfile);

router.delete('/:id', requirePermission('USERS', 'DELETE'), validate(userIdSchema), deleteUser);

export default router;
