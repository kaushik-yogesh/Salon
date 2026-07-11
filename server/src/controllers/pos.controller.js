import { prisma } from '../utils/db.js';
import { sendSuccess } from '../utils/response.util.js';
import { NotFoundError, AppError } from '../utils/errors.util.js';
import { logActivity } from '../utils/logger.js';

import { buildInvoicePayload, fulfillInvoiceInventory } from '../services/pos.service.js';
import { createGatewayIntent, processGatewayRefund } from '../services/payment.service.js';

export const checkoutAppointment = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { appointmentId, additionalProducts } = req.body;

    // Fetch the appointment and its services
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId, tenantId },
      include: { services: { include: { service: true } } }
    });

    if (!appointment) throw new NotFoundError('Appointment not found');
    if (appointment.status === 'COMPLETED') throw new AppError('Already checked out', 400);

    // Call POS Service to calculate totals and assemble cart
    const payload = await buildInvoicePayload(
      tenantId, 
      appointment.id, 
      appointment.branchId, 
      appointment.customerId, 
      appointment.services, 
      additionalProducts
    );

    // Create DRAFT Invoice
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        branchId: appointment.branchId,
        appointmentId: appointment.id,
        customerId: appointment.customerId,
        subtotal: payload.subtotal,
        taxTotal: payload.taxTotal,
        grandTotal: payload.grandTotal,
        status: 'DRAFT',
        lineItems: {
          create: payload.lineItemsData
        }
      },
      include: { lineItems: true }
    });

    sendSuccess(res, invoice, 201);
  } catch (error) {
    next(error);
  }
};

export const processPayment = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { invoiceId, amount, method } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId, tenantId } });
    if (!invoice) throw new NotFoundError('Invoice not found');

    if (method === 'WALLET') {
      if (!invoice.customerId) {
        throw new AppError('Cannot pay via Wallet for a walk-in customer without a profile', 400);
      }
      const customer = await prisma.customer.findUnique({ where: { id: invoice.customerId } });
      if (!customer || customer.walletBalance < amount) {
        throw new AppError('Insufficient wallet balance', 400);
      }
      // Deduct from wallet
      await prisma.customer.update({
        where: { id: customer.id },
        data: { walletBalance: { decrement: amount } }
      });
    }

    // Create the payment record
    const payment = await prisma.payment.create({
      data: { invoiceId, amount, method, transactionId: req.body.transactionId }
    });

    // If fully paid, update statuses
    const allPayments = await prisma.payment.findMany({ where: { invoiceId, status: 'COMPLETED' } });
    const totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid >= invoice.grandTotal) {
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
        actorId: req.user.id,
        action: 'INVOICE_PAID',
        resourceType: 'Invoice',
        resourceId: invoice.id,
        newValues: { grandTotal: invoice.grandTotal, method },
        ipAddress: req.ip
      });
    } else if (totalPaid > 0) {
      // Partial payment
      await prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: 'PARTIALLY_PAID' }
      });
    }

    sendSuccess(res, { payment, isFullyPaid: totalPaid >= invoice.grandTotal, totalPaid });
  } catch (error) {
    next(error);
  }
};

export const createIntent = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { invoiceId, gateway, amount } = req.body;

    const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId, tenantId }, include: { tenant: true } });
    if (!invoice) throw new NotFoundError('Invoice not found');
    if (invoice.status === 'PAID') throw new AppError('Invoice is already fully paid', 400);

    const intent = await createGatewayIntent(gateway, amount, invoice.tenant.defaultCurrency, {
      invoiceId,
      tenantId
    });
    sendSuccess(res, intent);
  } catch (error) {
    next(error);
  }
};

export const refundPayment = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { paymentId } = req.params;
    const { amount } = req.body; // optional partial refund

    const payment = await prisma.payment.findUnique({ 
      where: { id: paymentId },
      include: { invoice: true }
    });

    if (!payment || payment.invoice.tenantId !== tenantId) {
      throw new NotFoundError('Payment not found');
    }
    if (payment.status === 'REFUNDED') throw new AppError('Payment already refunded', 400);

    if (['STRIPE', 'RAZORPAY'].includes(payment.method) && payment.transactionId) {
      await processGatewayRefund(payment.method, payment.transactionId, amount || payment.amount);
    } else if (payment.method === 'WALLET') {
      const invoiceCustomer = payment.invoice.customerId;
      if (invoiceCustomer) {
        const refundAmount = amount || payment.amount;
        await prisma.customer.update({
          where: { id: invoiceCustomer },
          data: { walletBalance: { increment: refundAmount } }
        });
      }
    }

    const newStatus = (amount && amount < payment.amount) ? 'COMPLETED' : 'REFUNDED'; // Simplified for partial refunds

    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: { status: newStatus }
    });

    // Mark invoice as refunded/partially refunded if applicable
    await prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { status: 'REFUNDED' }
    });

    await logActivity({
      tenantId,
      actorId: req.user.id,
      action: 'PAYMENT_REFUNDED',
      resourceType: 'Payment',
      resourceId: payment.id,
      ipAddress: req.ip
    });

    sendSuccess(res, updatedPayment);
  } catch (error) {
    next(error);
  }
};
