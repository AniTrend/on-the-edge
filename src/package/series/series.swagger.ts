import { SeriesContract } from './series.contract.ts';
import {
  FormatContract,
  MediaKindContract,
  NetworkCategoryContract,
  SourceContract,
  StatusContract,
} from './series.contract.ts';
import { SeriesQuerySchema } from './series.schema.ts';

export const SeriesSwagger = SeriesContract;
export const SeriesFormatSwagger = FormatContract;
export const SeriesStatusSwagger = StatusContract;
export const SeriesSourceSwagger = SourceContract;
export const SeriesNetworkCategorySwagger = NetworkCategoryContract;
export const SeriesKindSwagger = MediaKindContract;

// deno-lint-ignore no-explicit-any
export const SeriesQuerySwagger = (SeriesQuerySchema as any).openapi({
  title: 'SeriesQuery',
  description: 'Query parameters for series lookup',
});
