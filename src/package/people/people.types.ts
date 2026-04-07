import { z } from 'zod';
import { PeopleDocumentSchema, PeopleQuerySchema } from './people.schema.ts';

export type PeopleDocument = z.infer<typeof PeopleDocumentSchema>;
export type PeopleQuery = z.infer<typeof PeopleQuerySchema>;
