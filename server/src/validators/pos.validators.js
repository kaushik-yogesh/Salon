import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    appointmentId: z.string().uuid('Invalid appointment ID format'),
    additionalProducts: z.array(z.object({
      productId: z.string().uuid('Invalid product ID format'),
      quantity: z.number().int().min(1)
    })).optional()
  })
});

export const processPaymentSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid('Invalid invoice ID format'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    method: z.enum(['CASH', 'CARD', 'GIFT_CARD', 'STRIPE', 'RAZORPAY', 'UPI', 'WALLET', 'OTHER'])
  })
});

export const paymentIntentSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid('Invalid invoice ID format'),
    gateway: z.enum(['STRIPE', 'RAZORPAY']),
    amount: z.number().min(0.01, 'Amount must be greater than 0')
  })
});

export const refundSchema = z.object({
  body: z.object({
    amount: z.number().min(0.01).optional()
  })
});
