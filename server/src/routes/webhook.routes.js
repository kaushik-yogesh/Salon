import express from 'express';
import { handleStripeWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// Stripe sends webhooks to this endpoint.
// IMPORTANT: This route requires the raw request body to verify signatures.
router.post('/stripe', handleStripeWebhook);

export default router;
