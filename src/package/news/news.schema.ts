import { z } from 'zod';
import { createPagingSchema } from '@scope/common/utils';

export const NewsSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string().url(),
  description: z.string(),
  content: z.string(),
  category: z.string().nullish(),
  genre: z.string().nullish(),
  area: z.string().nullish(),
  lang: z.string().nullish(),
  publishedOn: z.number().finite(),
  image: z.string().url().nullish(),
});

export const NewsQuerySchema = z.object({
  locale: z
    .string().length(5).default('en-US')
    .describe('Locale for the news feed, e.g., en-GB, de-DE, fr-FR.'),
}).strict();

export const NewsPagingSchema = createPagingSchema(NewsSchema);

export const NewsPagingQuerySchema = z.object({
  before: z.string().optional(),
  after: z.string().optional(),
  limit: z.coerce.number().min(1).default(15).optional(),
});
