import { z } from 'zod';
import { StudioDocumentSchema } from './studio.schema.ts';

export type StudioDocument = z.infer<typeof StudioDocumentSchema>;
export type StudioQuery = { anilistId: number; name?: string };
