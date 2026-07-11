import express from 'express';
import { checkoutAppointment, processPayment, createIntent, refundPayment } from '../controllers/pos.controller.js';
import { requireAuth, requireTenantContext } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { checkoutSchema, processPaymentSchema, paymentIntentSchema, refundSchema } from '../validators/pos.validators.js';

const router = express.Router();

router.use(requireAuth);
router.use(requireTenantContext);

router.post('/checkout/start', requirePermission('BILLING', 'CREATE'), validate(checkoutSchema), checkoutAppointment);
router.post('/payments', requirePermission('BILLING', 'CREATE'), validate(processPaymentSchema), processPayment);
router.post('/payments/intent', requirePermission('BILLING', 'CREATE'), validate(paymentIntentSchema), createIntent);
router.post('/payments/:paymentId/refund', requirePermission('BILLING', 'UPDATE'), validate(refundSchema), refundPayment);

export default router;
