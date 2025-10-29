import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { NewsPagingSchema, NewsSchema } from './news.schema.ts';

extendZodWithOpenApi(z);

export const NewsSwagger = NewsSchema.openapi({
  title: 'News',
  description: 'Schema representing a news document.',
});

export const NewsPagingSwagger = NewsPagingSchema.openapi({
  title: 'NewsPaging',
  description: 'Paged response for news documents.',
});
