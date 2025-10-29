import z from 'zod';
import {
  NewsPagingQuerySchema,
  NewsPagingSchema,
  NewsQuerySchema,
  NewsSchema,
} from './news.schema.ts';

export type News = z.infer<typeof NewsSchema>;
export type NewsPaging = z.infer<typeof NewsPagingSchema>;

export type NewsQuery = z.infer<typeof NewsQuerySchema>;
export type NewsPagingQuery = z.infer<typeof NewsPagingQuerySchema>;
