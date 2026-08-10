import { z } from 'zod';
import { UpdateProduct } from './header.types.ts';

/**
 * Runtime validation and normalization of the client-supplied header values
 * into the canonical client context fields.
 *
 * Every value is bounded so unbounded client strings never flow into
 * GrowthBook targeting attributes.
 */
export const clientContextSchema = z.object({
  appId: z.enum([UpdateProduct.ANITREND_APP, UpdateProduct.ANITREND_V2]),
  packageName: z.string().min(1).max(255),
  version: z.string().min(1).max(64),
  versionCode: z.coerce.number().int().positive(),
  source: z.string().min(1).max(64),
  locale: z.string().max(32),
  buildType: z.string().min(1).max(32),
  deviceBuildId: z
    .string()
    .max(128)
    .nullable()
    .transform((value) => (value && value.length > 0 ? value : null)),
});
