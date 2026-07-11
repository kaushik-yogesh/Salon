import express from 'express';
import { handleStripeWebhook, handleRazorpayWebhook } from '../controllers/webhook.controller.js';

const router = express.Router();

// Stripe sends webhooks to this endpoint.
// IMPORTANT: This route requires the raw request body to verify signatures.
router.post('/stripe', handleStripeWebhook);

// Razorpay sends webhooks to this endpoint.
router.post('/razorpay', handleRazorpayWebhook);

export default router;
