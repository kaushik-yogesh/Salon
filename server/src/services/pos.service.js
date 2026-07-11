import { prisma } from '../utils/db.js';
import { AppError } from '../utils/errors.util.js';

export const buildInvoicePayload = async (tenantId, appointmentId, branchId, customerId, appointmentServices, additionalProducts = []) => {
  let subtotal = 0;
  let taxTotal = 0;
  
  const lineItemsData = [];

  // Add Appointment Services
  for (const as of appointmentServices) {
    const unitPrice = as.price;
    const taxRate = as.service.taxRate || 0;
    const taxAmount = (unitPrice * (taxRate / 100));

    subtotal += unitPrice;
    taxTotal += taxAmount;

    lineItemsData.push({
      type: 'SERVICE',
      referenceId: as.serviceId,
      workerProfileId: as.workerProfileId,
      name: as.service.name,
      quantity: 1,
      unitPrice,
      taxAmount,
      totalPrice: unitPrice + taxAmount
    });
  }

  // Add Retail Products
  for (const p of additionalProducts) {
    const product = await prisma.product.findUnique({
      where: { id: p.productId, tenantId }
    });

    if (!product) throw new AppError(`Product ${p.productId} not found`, 404);
    if (product.stockQuantity < p.quantity) {
      throw new AppError(`Insufficient stock for ${product.name}. Only ${product.stockQuantity} available.`, 400);
    }

    const unitPrice = product.retailPrice;
    // Assuming standard retail tax, simplified here as 0 for products unless defined on schema
    const taxAmount = 0; 
    const itemTotal = (unitPrice * p.quantity) + taxAmount;

    subtotal += (unitPrice * p.quantity);
    taxTotal += taxAmount;

    lineItemsData.push({
      type: 'PRODUCT',
      referenceId: product.id,
      name: product.name,
      quantity: p.quantity,
      unitPrice,
      taxAmount,
      totalPrice: itemTotal
    });
  }

  return {
    subtotal,
    taxTotal,
    grandTotal: subtotal + taxTotal,
    lineItemsData
  };
};

export const fulfillInvoiceInventory = async (tenantId, invoiceId) => {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId, tenantId },
    include: { lineItems: true }
  });

  if (!invoice) throw new AppError('Invoice not found', 404);

  const productLineItems = invoice.lineItems.filter(li => li.type === 'PRODUCT' && li.referenceId);

  // Auto-deduct inventory using a transaction
  if (productLineItems.length > 0) {
    await prisma.$transaction(async (tx) => {
      for (const item of productLineItems) {
        // Create the audit log transaction
        await tx.inventoryTransaction.create({
          data: {
            productId: item.referenceId,
            type: 'SALE',
            quantity: -item.quantity, // Negative for deduction
            notes: `Sold on Invoice #${invoiceId.slice(-6)}`
          }
        });

        // Decrement actual stock
        await tx.product.update({
          where: { id: item.referenceId },
          data: { stockQuantity: { decrement: item.quantity } }
        });
      }
    });
  }
};
