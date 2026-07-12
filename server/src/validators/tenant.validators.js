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
    defaultTimezone: z.string().optional(),
    globalTaxRate: z.number().min(0).max(100).optional(),
    businessHours: z.record(z.object({
      isOpen: z.boolean(),
      open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format').optional(),
      close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format').optional()
    })).optional()
  })
});

export const tenantIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid tenant ID format')
  })
});
