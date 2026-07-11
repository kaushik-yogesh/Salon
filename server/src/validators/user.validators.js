import { z } from 'zod';

export const updateUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format')
  }),
  body: z.object({
    status: z.enum(['INVITED', 'ACTIVE', 'SUSPENDED'], {
      required_error: 'Status is required'
    })
  })
});

export const updateUserProfileSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format')
  }),
  body: z.object({
    firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
    lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
    phone: z.string().optional(),
    photoUrl: z.string().url('Invalid URL').optional(),
    emergencyContact: z.string().optional(),
    skills: z.array(z.string()).optional()
  })
});

export const userIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format')
  })
});
