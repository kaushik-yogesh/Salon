import express from 'express';
import { 
  getTenantProfile, 
  getTenantCatalog, 
  getTenantStaff, 
  createPublicBooking 
} from '../controllers/public.controller.js';

const router = express.Router();

router.get('/tenant/:tenantId', getTenantProfile);
router.get('/tenant/:tenantId/catalog', getTenantCatalog);
router.get('/tenant/:tenantId/staff', getTenantStaff);
router.post('/tenant/:tenantId/bookings', createPublicBooking);

export default router;
