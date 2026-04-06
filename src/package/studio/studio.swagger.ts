import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { StudioDocumentSchema } from './studio.schema.ts';

extendZodWithOpenApi(z);

export const StudioSwagger = StudioDocumentSchema.openapi({
  title: 'Studio',
  description: 'Animation studio metadata resolved from Jikan (MAL)',
});
