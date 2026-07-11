import { z } from 'zod';

export const createAppointmentSchema = z.object({
  body: z.object({
    branchId: z.string().uuid('Invalid branch ID format'),
    customerId: z.string().uuid('Invalid customer ID format'),
    date: z.string().datetime(),
    notes: z.string().optional(),
    services: z.array(z.object({
      serviceId: z.string().uuid(),
      workerProfileId: z.string().uuid(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      price: z.number().min(0)
    })).min(1, 'At least one service is required')
  }).superRefine((data, ctx) => {
    // Validate that endTime is after startTime for all services
    data.services.forEach((s, index) => {
      if (new Date(s.endTime) <= new Date(s.startTime)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Service at index ${index} must have an endTime after startTime`,
          path: ['services', index, 'endTime']
        });
      }
    });
  })
});
