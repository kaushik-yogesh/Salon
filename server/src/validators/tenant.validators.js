import { z } from 'zod';

export const createTenantSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Tenant name must be at least 2 characters'),
    subscriptionTier: z.string().optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultTimezone: z.string().optional()
  })
});

export const updateTenantSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid tenant ID format')
  }),
  body: z.object({
    name: z.string().min(2, 'Tenant name must be at least 2 characters').optional(),
    status: z.enum(['ACTIVE', 'SUSPENDED']).optional(),
    subscriptionTier: z.string().optional(),
    defaultCurrency: z.string().length(3).optional(),
    defaultTimezone: z.string().optional()
  })
});

export const tenantIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid tenant ID format')
  })
});
