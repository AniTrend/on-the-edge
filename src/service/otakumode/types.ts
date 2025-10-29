import { z } from 'zod';

export const FeedSchema = z.string().min(1, {
  message: 'RSS feed cannot be empty',
});
export type FeedResponse = z.infer<typeof FeedSchema>;
