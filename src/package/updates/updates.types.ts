import { z } from 'zod';
import {
  UpdateChannelSchema,
  UpdateProductSchema,
  UpdateQuerySchema,
  UpdateRecordSchema,
  UpdateReleaseAssetSchema,
  UpdateReleaseSchema,
} from './updates.schema.ts';

export type UpdateProduct = z.infer<typeof UpdateProductSchema>;
export type UpdateChannel = z.infer<typeof UpdateChannelSchema>;
export type UpdateReleaseAsset = z.infer<typeof UpdateReleaseAssetSchema>;
export type UpdateRelease = z.infer<typeof UpdateReleaseSchema>;
export type UpdateRecord = z.infer<typeof UpdateRecordSchema>;
export type UpdateQuery = z.input<typeof UpdateQuerySchema>;
/** Composite cache/cooldown key in the form `${product}:${channel}`. */
export type UpdateSourceKey = string;
