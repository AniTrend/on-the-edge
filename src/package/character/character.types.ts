import { z } from 'zod';
import { CharacterDocumentSchema } from './character.schema.ts';

export type CharacterDocument = z.infer<typeof CharacterDocumentSchema>;
export type CharacterQuery = { malId: number; name?: string };
