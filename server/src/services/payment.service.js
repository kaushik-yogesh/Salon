import Stripe from 'stripe';
import Razorpay from 'razorpay';
import { AppError } from '../utils/errors.util.js';

// Initialize SDKs only if keys are present (prevents crashing if not set)
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const razorpay = process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET 
  ? new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET }) 
  : null;

export const createGatewayIntent = async (gateway, amount, currency = 'USD', metadata = {}) => {
  if (gateway === 'STRIPE') {
    if (!stripe) {
      console.warn('[MOCK STRIPE] Create Intent');
      return { clientSecret: 'mock_stripe_secret_123', intentId: 'mock_intent_123' };
    }
    // Stripe expects amounts in smallest currency unit (cents)
    const amountInCents = Math.round(amount * 100);
    const intent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      metadata
    });
    return { clientSecret: intent.client_secret, intentId: intent.id };
  } 
  
  if (gateway === 'RAZORPAY') {
    if (!razorpay) {
      console.warn('[MOCK RAZORPAY] Create Order');
      return { orderId: 'mock_razorpay_order_123' };
    }
    const amountInPaise = Math.round(amount * 100);
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: currency.toUpperCase(),
      receipt: `receipt_${Date.now()}`
    });
    return { orderId: order.id };
  }

  throw new AppError('Unsupported payment gateway', 400);
};

export const processGatewayRefund = async (gateway, transactionId, amount) => {
  if (gateway === 'STRIPE') {
    if (!stripe) {
      console.warn(`[MOCK STRIPE] Refund transaction ${transactionId}`);
      return { refundId: 'mock_stripe_refund_123', status: 'succeeded' };
    }
    const amountInCents = amount ? Math.round(amount * 100) : undefined;
    const refund = await stripe.refunds.create({
      payment_intent: transactionId,
      amount: amountInCents,
    });
    return { refundId: refund.id, status: refund.status };
  }

  if (gateway === 'RAZORPAY') {
    if (!razorpay) {
      console.warn(`[MOCK RAZORPAY] Refund transaction ${transactionId}`);
      return { refundId: 'mock_razorpay_refund_123', status: 'processed' };
    }
    const amountInPaise = amount ? Math.round(amount * 100) : undefined;
    const refund = await razorpay.payments.refund(transactionId, {
      amount: amountInPaise
    });
    return { refundId: refund.id, status: refund.status };
  }

  throw new AppError('Unsupported payment gateway for refund', 400);
};
