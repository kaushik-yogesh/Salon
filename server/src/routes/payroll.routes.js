import express from 'express';
import { getMyEarnings } from '../controllers/payroll.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

// Worker views their own earnings
router.get('/my-earnings', getMyEarnings);

export default router;
