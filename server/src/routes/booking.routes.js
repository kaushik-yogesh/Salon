import express from 'express';
import { 
  getAppointments, 
  createAppointment, 
  updateAppointment, 
  updateAppointmentStatus,
  getWaitlist,
  createWaitlist,
  updateWaitlistStatus
} from '../controllers/booking.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAppointmentSchema, updateAppointmentSchema, updateAppointmentStatusSchema } from '../validators/booking.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

// Waitlist
router.get('/waitlist', requirePermission('BOOKINGS', 'READ'), getWaitlist);
router.post('/waitlist', requirePermission('BOOKINGS', 'CREATE'), createWaitlist);
router.put('/waitlist/:id/status', requirePermission('BOOKINGS', 'UPDATE'), updateWaitlistStatus);

router.get('/', requirePermission('BOOKINGS', 'READ'), getAppointments);
router.post('/', requirePermission('BOOKINGS', 'CREATE'), validate(createAppointmentSchema), createAppointment);
router.put('/:id', requirePermission('BOOKINGS', 'UPDATE'), validate(updateAppointmentSchema), updateAppointment);
router.put('/:id/status', requirePermission('BOOKINGS', 'UPDATE'), validate(updateAppointmentStatusSchema), updateAppointmentStatus);

export default router;
