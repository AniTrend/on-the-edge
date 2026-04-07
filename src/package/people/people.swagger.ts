import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { PeopleDocumentSchema } from './people.schema.ts';

extendZodWithOpenApi(z);

export const PeopleSwagger = PeopleDocumentSchema.openapi({
  title: 'Person',
  description: 'Anime staff or voice actor metadata resolved from Jikan (MAL)',
});
