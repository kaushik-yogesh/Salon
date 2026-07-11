import express from 'express';
import { scanQR, startService, completeService, getQR, getActiveExecution, pauseService, resumeService } from '../controllers/execution.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { scanQrSchema } from '../validators/execution.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

// Get or generate a QR code for an appointment
router.get('/:appointmentId/qr', requirePermission('BOOKINGS', 'READ'), getQR);

// Fetch the worker's active execution session
router.get('/active', requirePermission('BOOKINGS', 'READ'), getActiveExecution);

// Worker scans a customer's appointment QR
router.post('/scan', requirePermission('BOOKINGS', 'UPDATE'), validate(scanQrSchema), scanQR);

// Worker explicitly starts the service
router.post('/:appointmentId/start', requirePermission('BOOKINGS', 'UPDATE'), startService);

// Worker explicitly pauses the service
router.post('/:appointmentId/pause', requirePermission('BOOKINGS', 'UPDATE'), pauseService);

// Worker explicitly resumes the service
router.post('/:appointmentId/resume', requirePermission('BOOKINGS', 'UPDATE'), resumeService);

// Worker completes the service (triggers auto billing & payroll)
router.post('/:appointmentId/complete', requirePermission('BOOKINGS', 'UPDATE'), completeService);

export default router;
