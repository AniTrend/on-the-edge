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

/**
 * Result of an update lookup for a specific client (spec 9.2).
 *
 * UP_TO_DATE: the client version code is equal to or newer than the
 * cached release, so no update is offered (downgrades are never
 * encouraged). UPDATE_AVAILABLE: a release newer than the client
 * version code exists. UNSUPPORTED: no source is configured for the
 * requested (product, channel), so no decision is possible; the
 * optional release carries context when one exists.
 */
export type UpdateDecision =
  | { status: 'UP_TO_DATE' }
  | { status: 'UPDATE_AVAILABLE'; release: UpdateRelease }
  | { status: 'UNSUPPORTED'; release?: UpdateRelease };
/** Composite cache/cooldown key in the form `${product}:${channel}`. */
export type UpdateSourceKey = string;
