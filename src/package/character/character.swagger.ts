import { z } from 'zod';
import { extendZodWithOpenApi } from '@anatine/zod-openapi';
import { CharacterDocumentSchema } from './character.schema.ts';

extendZodWithOpenApi(z);

export const CharacterSwagger = CharacterDocumentSchema.openapi({
  title: 'Character',
  description:
    'Fictional character metadata resolved from Jikan (MAL), including media and voice-actor relations',
});
