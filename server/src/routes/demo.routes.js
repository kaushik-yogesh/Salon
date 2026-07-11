import express from 'express';
import { seedDemoData, resetDemoData } from '../controllers/demo.controller.js';
import { requireAuth } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Demo routes are protected — require SUPER_ADMIN role
router.use(requireAuth);

router.use((req, res, next) => {
  const userRoles = req.user?.userRoles?.map(ur => ur.role.name) || [];
  if (!userRoles.includes('SUPER_ADMIN')) {
    return res.status(403).json({ success: false, error: { message: 'Only Super Admins can manage demo data' } });
  }
  next();
});

router.post('/seed', seedDemoData);
router.post('/reset', resetDemoData);

export default router;
