import { prisma } from '../utils/db.js';
import { calculateCommission } from './payroll.service.js';

/**
 * Automates invoice generation and inventory deduction when an appointment is completed.
 */
export const generateInvoiceFromAppointment = async (appointmentId, tenantId, productsUsed = []) => {
  // 1. Fetch appointment details
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      services: {
        include: { service: true }
      },
      branch: true
    }
  });

  if (!appointment) throw new Error('Appointment not found');

  // Check if invoice already exists
  const existingInvoice = await prisma.invoice.findUnique({
    where: { appointmentId }
  });

  if (existingInvoice) return existingInvoice;

  let subtotal = 0;
  let taxTotal = 0;

  // Prepare line items
  const lineItems = appointment.services.map(as => {
    const unitPrice = as.price;
    const taxAmount = (as.service.taxRate / 100) * unitPrice;
    const totalPrice = unitPrice + taxAmount;
    
    subtotal += unitPrice;
    taxTotal += taxAmount;

    return {
      type: 'SERVICE',
      referenceId: as.serviceId,
      workerProfileId: as.workerProfileId,
      name: as.service.name,
      quantity: 1,
      unitPrice,
      taxAmount,
      totalPrice
    };
  });

  const customer = await prisma.customer.findUnique({ where: { id: appointment.customerId } });
  
  // Apply 10% Loyalty discount if they have > 1000 points
  let discountTotal = 0;
  if (customer && customer.loyaltyPoints > 1000) {
    discountTotal = subtotal * 0.10;
  }

  const grandTotal = subtotal + taxTotal - discountTotal;

  // Auto-deduct from wallet if balance > grandTotal
  let paymentStatus = 'DRAFT';
  let walletDeducted = 0;
  if (customer && customer.walletBalance >= grandTotal && grandTotal > 0) {
    paymentStatus = 'PAID';
    walletDeducted = grandTotal;
  }

  // 2. Create the invoice
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      branchId: appointment.branchId,
      appointmentId: appointment.id,
      customerId: appointment.customerId,
      subtotal,
      taxTotal,
      discountTotal,
      grandTotal,
      status: paymentStatus,
      lineItems: {
        create: lineItems
      }
    },
    include: {
      lineItems: true
    }
  });

  if (walletDeducted > 0) {
    await prisma.payment.create({
      data: { invoiceId: invoice.id, amount: walletDeducted, method: 'WALLET', status: 'COMPLETED' }
    });
    // Deduct wallet balance, update LTV, and grant 1 loyalty point per $1 spent
    await prisma.customer.update({
      where: { id: customer.id },
      data: { 
        walletBalance: { decrement: walletDeducted },
        lifetimeValue: { increment: grandTotal },
        loyaltyPoints: { increment: Math.floor(grandTotal) }
      }
    });
  } else {
    // Update LTV and loyalty points only
    await prisma.customer.update({
      where: { id: customer.id },
      data: { 
        lifetimeValue: { increment: grandTotal },
        loyaltyPoints: { increment: Math.floor(grandTotal) }
      }
    });
  }

  // 3. Deduct inventory if products were used
  for (const item of productsUsed) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (product) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stockQuantity: { decrement: item.quantity } }
      });
      await prisma.inventoryTransaction.create({
        data: {
          productId: item.productId,
          type: 'SALE',
          quantity: -item.quantity,
          notes: `Used during appointment ${appointment.id}`
        }
      });
    }
  }

  // Customer LTV and Loyalty are already updated above when applying payments/wallets

  // 5. Trigger Payroll & Commission Engine
  // We trigger it asynchronously or immediately so workers see their earnings instantly.
  await calculateCommission(invoice.id, tenantId);

  return invoice;
};
