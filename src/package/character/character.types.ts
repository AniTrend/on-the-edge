import { z } from 'zod';
import {
  CharacterDocumentSchema,
  CharacterQuerySchema,
} from './character.schema.ts';

export type CharacterDocument = z.infer<typeof CharacterDocumentSchema>;
export type CharacterQuery = z.infer<typeof CharacterQuerySchema>;
