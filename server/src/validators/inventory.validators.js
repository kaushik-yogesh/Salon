import { z } from 'zod';

export const adjustStockSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    type: z.enum(['RESTOCK', 'SALE', 'SHRINKAGE', 'ADJUSTMENT']),
    quantity: z.number().int(),
    notes: z.string().optional()
  })
});
