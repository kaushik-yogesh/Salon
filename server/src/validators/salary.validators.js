import { z } from 'zod';

export const generateSalarySchema = z.object({
  body: z.object({
    periodStart: z.string().datetime('Invalid start date format'),
    periodEnd: z.string().datetime('Invalid end date format')
  }).superRefine((data, ctx) => {
    if (new Date(data.periodEnd) < new Date(data.periodStart)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'periodEnd must be after or equal to periodStart',
        path: ['periodEnd']
      });
    }
  })
});
