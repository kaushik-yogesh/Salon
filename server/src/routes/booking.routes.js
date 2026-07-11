import express from 'express';
import { getAppointments, createAppointment } from '../controllers/booking.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { createAppointmentSchema } from '../validators/booking.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.get('/', requirePermission('BOOKINGS', 'READ'), getAppointments);
router.post('/', requirePermission('BOOKINGS', 'CREATE'), validate(createAppointmentSchema), createAppointment);

export default router;
