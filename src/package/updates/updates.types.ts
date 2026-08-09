import { z } from 'zod';
import {
  UpdateChannelSchema,
  UpdateQuerySchema,
  UpdateRecordSchema,
  UpdateReleaseSchema,
} from './updates.schema.ts';

export type UpdateChannel = z.infer<typeof UpdateChannelSchema>;
export type UpdateRelease = z.infer<typeof UpdateReleaseSchema>;
export type UpdateRecord = z.infer<typeof UpdateRecordSchema>;
export type UpdateQuery = z.input<typeof UpdateQuerySchema>;
