/**
 * OpenAPI contract naming constants.
 *
 * These are the expected public schema names and operation IDs that
 * the generated spec must contain. The validator uses these to detect
 * accidental removal or renaming of public contract entries.
 *
 * EXPECTED_SCHEMA_NAMES only includes schemas that the
 * @anatine/zod-openapi library registers as top-level components.
 * Deeply nested schemas (more than 1 level) may be inlined by the
 * library and should not be listed here.
 */

/**
 * Expected top-level component schema names in the generated OpenAPI document.
 * These correspond to the `title` field in each contract's `.openapi()` call
 * for schemas that the library registers as components.schemas entries.
 */
export const EXPECTED_SCHEMA_NAMES = [
  // Config (direct response + immediate children)
  'Config',
  'ConfigSettings',
  'ConfigImage',

  // News (direct response + paging)
  'News',
  'NewsConnection',

  // Episodes (direct response)
  'Episodes',

  // Series (direct response + immediate children)
  'Series',
  'SeriesId',
  'SeriesTitle',
  'SeriesSchedule',
  'SeriesCoverImage',

  // Studio (direct response)
  'Studio',

  // People (direct response)
  'Person',

  // Character (direct response)
  'Character',

  // Push (currently shipped endpoints only)
  'PushVapid',
  'PushInstallation',
  'PushAcknowledgment',
  'PushRegistrationBody',
  'PushConfirmBody',
  'PushProfileBody',
  'PushPreferencesBody',
  'PushDeleteBody',

  // Input / enum schemas (extracted by extractInlineSchemas)
  'EpisodeKind',
  'NewsFeedLocale',
  'SeriesFormat',
  'SeriesStatus',
  'SeriesSource',
  'SeriesKind',
  'SeriesNetworkCategory',

  // Health (direct response)
  'Health',
] as const;

/**
 * Expected public operation IDs in the generated OpenAPI document.
 * These correspond to the controller route method names.
 */
export const EXPECTED_OPERATION_IDS = [
  'config',
  'newsFeed',
  'news',
  'episodes',
  'series',
  'studio',
  'person',
  'character',
  'index',
  'vapid',
  'registerInstallation',
  'confirmInstallation',
  'updateProfile',
  'updatePreferences',
  'deleteInstallation',
  'sendTestPush',
  'health',
] as const;

/**
 * Schema names that are allowed to be lowercase or path-derived.
 * Only add entries here with documented justification.
 */
export const ALLOWLIST_LOWERCASE_NAMES: readonly string[] = [];

/**
 * Pattern that valid schema component names must match.
 * PascalCase or UpperCamelCase starting with an uppercase letter.
 */
export const VALID_SCHEMA_NAME_PATTERN = /^[A-Z][A-Za-z0-9]*$/;
