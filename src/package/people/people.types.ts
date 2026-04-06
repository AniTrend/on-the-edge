import { z } from 'zod';
import { PeopleDocumentSchema } from './people.schema.ts';

export type PeopleDocument = z.infer<typeof PeopleDocumentSchema>;
export type PeopleQuery = { anilistId: number; name?: string };
