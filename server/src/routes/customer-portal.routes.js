import express from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import * as portalController from '../controllers/customer-portal.controller.js';

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard', portalController.getDashboard);
router.get('/bookings', portalController.getAppointments);
router.post('/bookings', portalController.createBooking);
router.post('/bookings/:id/cancel', portalController.cancelBooking);
router.get('/bookings/:id/qr', portalController.getBookingQR);
router.get('/wallets', portalController.getWallets);
router.post('/wallets/:tenantId/topup', portalController.topUpWallet);
router.put('/profile', portalController.updateProfile);

export default router;
