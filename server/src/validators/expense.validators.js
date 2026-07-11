import { z } from 'zod';

export const createExpenseSchema = z.object({
  body: z.object({
    branchId: z.string().uuid('Invalid branch ID').optional(),
    category: z.enum(['SUPPLIES', 'RENT', 'UTILITIES', 'MARKETING', 'PETTY_CASH', 'OTHER']),
    amount: z.number().positive('Amount must be positive'),
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid date format' }),
    description: z.string().max(255).optional(),
    receiptUrl: z.string().url('Invalid URL').optional()
  })
});

export const updateExpenseStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED'])
  })
});
