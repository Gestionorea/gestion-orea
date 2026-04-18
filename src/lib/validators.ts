import { z } from 'zod';

export const contactTypeSchema = z.enum(['broker', 'lender', 'partner']);

export const contactSchema = z.object({
  type: contactTypeSchema,
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional(),
  message: z.string().trim().min(1).max(5000),
  website: z.string().trim().optional(),
  doors: z.string().trim().max(40).optional(),
  city: z.string().trim().max(200).optional(),
  institution: z.string().trim().max(200).optional(),
  context: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(5000).optional(),
}).strict();

export type ContactFormData = z.infer<typeof contactSchema>;
