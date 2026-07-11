import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    tenantId: z.string().uuid('Invalid tenant ID format').optional(),
    salonName: z.string().min(2, 'Salon name is required for owner registration').optional(),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    roleId: z.string().uuid('Invalid role ID format').optional()
  }).refine(data => data.tenantId || data.salonName, {
    message: "Either tenantId (for staff) or salonName (for owner) must be provided"
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required')
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    tenantId: z.string().uuid('Invalid tenant ID format')
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters long')
  })
});
