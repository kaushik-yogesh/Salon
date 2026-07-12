import { z } from 'zod';

export const adjustStockSchema = z.object({
  body: z.object({
    productId: z.string().uuid('Invalid product ID format'),
    type: z.enum(['RESTOCK', 'SALE', 'SHRINKAGE', 'ADJUSTMENT']),
    quantity: z.number().int(),
    notes: z.string().optional()
  })
});

export const createProductSchema = z.object({
  body: z.object({
    branchId: z.string().uuid(),
    sku: z.string().min(1),
    name: z.string().min(2),
    description: z.string().optional(),
    retailPrice: z.number().min(0),
    costPrice: z.number().min(0).optional(),
    stockQuantity: z.number().int().min(0).default(0),
    lowStockThreshold: z.number().int().min(0).default(5),
    status: z.enum(['ACTIVE', 'DISCONTINUED']).default('ACTIVE')
  })
});
