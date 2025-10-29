import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { MediaUnionSchema } from './series.schema.ts';

extendZodWithOpenApi(z);

export const SeriesSwagger = MediaUnionSchema.openapi({
  title: 'Series',
  description: 'Aggregated of media entities from multiple sources',
});
