import { z } from 'zod';
import { parse } from '@std/yaml';
import { UpdateChannelSchema, UpdateProductSchema } from './updates.schema.ts';
import type { UpdateChannel, UpdateProduct } from './updates.types.ts';

/**
 * Release channel selector. Stable is a plain release; prerelease
 * optionally narrows to prerelease identifiers (beta, rc, alpha, dev,
 * experimental). Identifiers are matched against the semver prerelease
 * components of each release tag.
 */
export const ReleaseSelectorSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('stable') }),
  z.object({
    type: z.literal('prerelease'),
    identifiers: z.array(z.string().min(1)).min(1).max(10).optional(),
  }),
]);

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

export type UpdateSource = z.infer<typeof UpdateSourceSchema>;

const UpdateChannelConfigSchema = z.object({
  selector: ReleaseSelectorSchema,
  rollingWindowDays: z.number().int().min(1).max(3650).optional(),
  assets: z.object({
    preferred: z.array(
      z.string().regex(
        ASSET_NAME_PATTERN,
        'asset name contains invalid characters',
      ),
    ).max(10).optional(),
  }).optional(),
});

const UpdateProductConfigSchema = z.object({
  repository: z.string().regex(
    REPOSITORY_PATTERN,
    'repository must be owner/repo with slug characters only',
  ),
  version: z.object({
    propertiesPath: z.string().regex(
      PROPERTIES_PATH_PATTERN,
      'properties path contains invalid characters',
    ),
  }).optional(),
  channels: z.record(UpdateChannelSchema, UpdateChannelConfigSchema),
});

/**
 * Schema for the versioned YAML update sources document. schemaVersion
 * is a literal: a missing or newer value is a validation error so the
 * document never silently changes meaning under a newer reader.
 */
export const UpdateSourcesConfigSchema = z.object({
  schemaVersion: z.literal(1),
  products: z.record(UpdateProductSchema, UpdateProductConfigSchema),
});

type UpdateSourcesConfig = z.infer<typeof UpdateSourcesConfigSchema>;
type UpdateProductConfig = z.infer<typeof UpdateProductConfigSchema>;
type UpdateChannelConfig = z.infer<typeof UpdateChannelConfigSchema>;

const formatIssues = (issues: z.ZodIssue[]): string => {
  return issues.map((issue) => {
    const path = issue.path.join('.') || 'root';
    return `${path}: ${issue.message}`;
  }).join('; ');
};

/** Flatten the product-centric document into the internal source list. */
const flattenSources = (config: UpdateSourcesConfig): UpdateSource[] => {
  const sources: UpdateSource[] = [];
  for (const product of UpdateProductSchema.options) {
    const productConfig = config.products[product];
    if (!productConfig) continue;
    for (const channel of UpdateChannelSchema.options) {
      const channelConfig = productConfig.channels[channel];
      if (!channelConfig) continue;
      sources.push(toSource(product, productConfig, channel, channelConfig));
    }
  }
  return sources;
};

const toSource = (
  product: UpdateProduct,
  productConfig: UpdateProductConfig,
  channel: UpdateChannel,
  channelConfig: UpdateChannelConfig,
): UpdateSource => {
  const source: UpdateSource = {
    product,
    channel,
    repository: productConfig.repository,
    selector: channelConfig.selector,
  };
  if (productConfig.version) {
    source.propertiesPath = productConfig.version.propertiesPath;
  }
  if (channelConfig.rollingWindowDays !== undefined) {
    source.rollingWindowDays = channelConfig.rollingWindowDays;
  }
  if (channelConfig.assets?.preferred) {
    source.assets = channelConfig.assets.preferred;
  }
  return source;
};

export const UPDATE_CONFIG_ENV = 'UPDATE_CONFIG_PATH';

/**
 * Canonical JSON serialization of the policy-relevant source fields,
 * built with a fixed key order so the resulting digest is stable
 * across runs and re-orderings of the YAML document. The config
 * `schemaVersion` is deliberately excluded: it is global and constant
 * for the lifetime of a reader, so it carries no per-source signal
 * (spec 10.3).
 */
const policyCanonical = (source: UpdateSource): string => {
  const selector: Record<string, unknown> = { type: source.selector.type };
  if (source.selector.type === 'prerelease' && source.selector.identifiers) {
    selector.identifiers = source.selector.identifiers;
  }
  return JSON.stringify({
    repository: source.repository,
    propertiesPath: source.propertiesPath ?? null,
    selector,
    rollingWindowDays: source.rollingWindowDays ?? null,
    assets: source.assets ?? null,
  });
};

/**
 * SHA-256 fingerprint of the policy-relevant fields of a source. A
 * change to any covered field invalidates the fingerprint, so a cached
 * record selected under a different fingerprint must not have its ETag
 * trusted for 304 revalidation (spec 10.3-10.4).
 */
export const computePolicyFingerprint = async (
  source: UpdateSource,
): Promise<string> => {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(policyCanonical(source)),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

/**
 * Embedded default document, resolved relative to this module so it
 * survives `deno compile --include config/update-sources.yml` and the
 * Dockerfile deleting the source tree at runtime.
 */
const EMBEDDED_CONFIG_URL = new URL(
  '../../../config/update-sources.yml',
  import.meta.url,
);

/**
 * Load and validate the update sources configuration.
 *
 * With no path (or a blank one) the embedded default document is read.
 * A provided path must exist and parse cleanly: a missing or unreadable
 * file, malformed YAML, or a schema violation each throw a descriptive
 * error so misconfiguration fails loudly at startup. An empty sources
 * result is valid and disables update refresh.
 */
export const loadUpdateSources = (configPath?: string): UpdateSource[] => {
  const target = configPath === undefined || configPath.trim().length === 0
    ? EMBEDDED_CONFIG_URL
    : configPath;

  let text: string;
  try {
    text = Deno.readTextFileSync(target);
  } catch (error) {
    throw new Error(
      `Unable to read update sources config at ${target}: ${(error as Error).message
      }`,
    );
  }

  let document: unknown;
  try {
    document = parse(text);
  } catch (error) {
    throw new Error(
      `Invalid YAML in update sources config at ${target}: ${(error as Error).message
      }`,
    );
  }

  const parsed = UpdateSourcesConfigSchema.safeParse(document);
  if (!parsed.success) {
    throw new Error(
      `Invalid update sources config at ${target}: ${formatIssues(parsed.error.issues)
      }`,
    );
  }
  return flattenSources(parsed.data);
};
