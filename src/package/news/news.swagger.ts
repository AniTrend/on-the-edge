import { NewsConnectionContract, NewsContract } from './news.contract.ts';
import { NewsPagingQuerySchema, NewsQuerySchema } from './news.schema.ts';

export const NewsSwagger = NewsContract;
export const NewsPagingSwagger = NewsConnectionContract;

// deno-lint-ignore no-explicit-any
export const NewsQuerySwagger = (NewsQuerySchema as any).openapi({
  title: 'NewsQuery',
  description: 'Query parameters for news feed',
});

// deno-lint-ignore no-explicit-any
export const NewsPagingQuerySwagger = (NewsPagingQuerySchema as any).openapi({
  title: 'NewsPagingQuery',
  description: 'Query parameters for paged news listing',
});
