import { z } from 'zod';
import { StudioDocumentSchema, StudioQuerySchema } from './studio.schema.ts';

export type StudioDocument = z.infer<typeof StudioDocumentSchema>;
export type StudioQuery = z.infer<typeof StudioQuerySchema>;
