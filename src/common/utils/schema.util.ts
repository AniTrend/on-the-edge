import { z } from 'zod';

export const createPagingSchema = <T>(schema: z.ZodType<T>) =>
  z.object({
    first: z.string().optional(),
    last: z.string().optional(),
    count: z.number().min(0),
    data: z.array(schema),
  });
