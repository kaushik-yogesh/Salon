import { z } from 'zod';

export const scanQrSchema = z.object({
  body: z.object({
    qrToken: z.string().min(10, 'Invalid QR token format')
  })
});
