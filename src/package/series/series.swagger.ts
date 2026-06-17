import { SeriesContract } from './series.contract.ts';
import { SeriesQuerySchema } from './series.schema.ts';

export const SeriesSwagger = SeriesContract;

// deno-lint-ignore no-explicit-any
export const SeriesQuerySwagger = (SeriesQuerySchema as any).openapi({
  title: 'SeriesQuery',
  description: 'Query parameters for series lookup',
});
