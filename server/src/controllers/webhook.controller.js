import Stripe from 'stripe';
import { prisma } from '../utils/db.js';
import { logActivity } from '../utils/logger.js';
import { fulfillInvoiceInventory } from '../services/pos.service.js';

// Use a distinct Stripe instance or just standard init
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export const handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error('Stripe webhook received but missing secret or SDK');
    return res.status(400).send('Stripe not configured');
  }

  let event;

  try {
    // req.body must be raw string/buffer for constructEvent
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    // Handle the event
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      const { invoiceId, tenantId } = paymentIntent.metadata;

      if (!invoiceId || !tenantId) {
        console.warn('PaymentIntent succeeded but missing metadata');
        return res.json({ received: true });
      }

      const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId } });
      if (!invoice) {
        console.warn('PaymentIntent succeeded but invoice not found:', invoiceId);
        return res.json({ received: true });
      }

      // Check if this payment already exists to prevent duplicates
      const existingPayment = await prisma.payment.findFirst({
        where: { transactionId: paymentIntent.id }
      });

      if (!existingPayment) {
        // Create the payment record
        await prisma.payment.create({
          data: {
            invoiceId,
            amount: paymentIntent.amount / 100, // Convert from cents
            method: 'STRIPE',
            transactionId: paymentIntent.id,
            status: 'COMPLETED'
          }
        });
      }

      // Calculate total paid
      const allPayments = await prisma.payment.findMany({ where: { invoiceId, status: 'COMPLETED' } });
      const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

      // If fully paid, update statuses
      // Using a small epsilon for floating point comparison
      if (totalPaid >= invoice.grandTotal - 0.01) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'PAID' }
        });

        if (invoice.appointmentId) {
          await prisma.appointment.update({
            where: { id: invoice.appointmentId },
            data: { status: 'COMPLETED' }
          });
        }

        // Auto-deduct inventory for sold products
        await fulfillInvoiceInventory(tenantId, invoice.id);

        await logActivity({
          tenantId,
          actorId: null, // System action
          action: 'INVOICE_PAID',
          resourceType: 'Invoice',
          resourceId: invoice.id,
          newValues: { grandTotal: invoice.grandTotal, method: 'STRIPE_WEBHOOK' },
          ipAddress: req.ip
        });
      } else {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { status: 'PARTIALLY_PAID' }
        });
      }
    }

    // Acknowledge receipt of the event
    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook event:', error);
    res.status(500).json({ error: 'Internal Server Error processing webhook' });
  }
};
