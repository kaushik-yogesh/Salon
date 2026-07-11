import { z } from 'zod';

export const createWorkerProfileSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    title: z.string().optional(),
    bio: z.string().optional(),
    baseCommissionRate: z.number().min(0).max(100).optional(),
    schedules: z.array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
      isWorking: z.boolean().optional()
    })).optional(),
    services: z.array(z.object({
      serviceId: z.string().uuid()
    })).optional()
  })
});

export const updateWorkerProfileSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid worker profile ID format')
  }),
  body: z.object({
    title: z.string().optional(),
    bio: z.string().optional(),
    baseCommissionRate: z.number().min(0).max(100).optional(),
    isActive: z.boolean().optional()
  })
});

export const updateScheduleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid worker profile ID format')
  }),
  body: z.object({
    schedules: z.array(z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
      endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format (HH:MM)'),
      isWorking: z.boolean().default(true)
    }))
  })
});

export const timeOffRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid worker profile ID format')
  }),
  body: z.object({
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    reason: z.string().optional()
  })
});

export const timeOffStatusSchema = z.object({
  params: z.object({
    requestId: z.string().uuid('Invalid time off request ID format')
  }),
  body: z.object({
    status: z.enum(['APPROVED', 'REJECTED'])
  })
});

export const workerIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid worker profile ID format')
  })
});
