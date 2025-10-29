import z from 'zod';
import { ArmSchema } from './arm.schema.ts';

export type SeriesRelationId = z.infer<typeof ArmSchema>;
