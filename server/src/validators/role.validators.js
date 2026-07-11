import { z } from 'zod';

export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Role name is required'),
    description: z.string().optional(),
    priority: z.number().int().optional(),
    permissions: z.array(z.string().uuid('Invalid permission ID format')).default([])
  })
});

export const updateRoleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID format')
  }),
  body: z.object({
    name: z.string().min(2, 'Role name is required').optional(),
    description: z.string().optional(),
    priority: z.number().int().optional(),
    permissions: z.array(z.string().uuid('Invalid permission ID format')).optional()
  })
});

export const roleIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid role ID format')
  })
});
