import { z } from 'zod';
import { UpdateChannelSchema, UpdateProductSchema } from './updates.schema.ts';

export const ReleaseSelectorSchema = z.enum(['stable', 'prerelease']);

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const PROPERTIES_PATH_PATTERN = /^(?!\/)(?!.*\.\.)[A-Za-z0-9_./-]+$/;
const ASSET_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/;

/**
 * Validated GitHub Releases source for one (product, channel) pair.
 * All identity values are regex-bounded so they cannot inject into the
 * constructed GitHub URLs; the URLs themselves are https by
 * construction.
 */
export const UpdateSourceSchema = z.object({
  product: UpdateProductSchema,
  channel: UpdateChannelSchema,
  repository: z.string().regex(
    REPOSITORY_PATTERN,
    'repository must be owner/repo with slug characters only',
  ),
  propertiesPath: z.string().regex(
    PROPERTIES_PATH_PATTERN,
    'properties path contains invalid characters',
  ).optional(),
  selector: ReleaseSelectorSchema,
  rollingWindowDays: z.number().int().min(1).max(3650).optional(),
  assets: z.array(
    z.string().regex(
      ASSET_NAME_PATTERN,
      'asset name contains invalid characters',
    ),
  ).max(10).optional(),
});

export const UpdateSourcesSchema = z.object({
  // An empty sources list is valid and disables update refresh.
  sources: z.array(UpdateSourceSchema).max(24),
}).refine(({ sources }) => {
  const keys = sources.map((source) => `${source.product}:${source.channel}`);
  return new Set(keys).size === keys.length;
}, { message: 'duplicate product/channel sources are not allowed' });

export type UpdateSource = z.infer<typeof UpdateSourceSchema>;

export const UPDATE_SOURCES_ENV = 'UPDATE_SOURCES';

/**
 * Parse and validate the UPDATE_SOURCES JSON environment value.
 * Absent or empty values yield no sources; malformed JSON or schema
 * violations throw a descriptive error so misconfiguration fails
 * loudly at startup.
 */
export const parseUpdateSources = (raw: string | undefined): UpdateSource[] => {
  if (raw === undefined || raw.trim().length === 0) return [];
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    throw new Error(
      `UPDATE_SOURCES is not valid JSON: ${(error as Error).message}`,
    );
  }
  const parsed = UpdateSourcesSchema.safeParse(json);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => {
      const path = issue.path.join('.') || 'root';
      return `${path}: ${issue.message}`;
    }).join('; ');
    throw new Error(`Invalid UPDATE_SOURCES configuration: ${issues}`);
  }
  return parsed.data.sources;
};
