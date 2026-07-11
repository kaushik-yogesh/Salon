import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import * as portalController from '../controllers/customer-portal.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard', portalController.getDashboard);
router.get('/appointments', portalController.getAppointments);
router.post('/bookings', portalController.createBooking);
router.post('/bookings/:id/cancel', portalController.cancelBooking);
router.get('/wallets', portalController.getWallets);

export default router;
