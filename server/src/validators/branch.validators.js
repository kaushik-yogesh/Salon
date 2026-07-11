import { z } from 'zod';

export const createBranchSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Branch name must be at least 2 characters'),
    address: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']).optional()
  })
});

export const updateBranchSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid branch ID format')
  }),
  body: z.object({
    name: z.string().min(2, 'Branch name must be at least 2 characters').optional(),
    address: z.string().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'CLOSED']).optional()
  })
});

export const branchIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid branch ID format')
  })
});
