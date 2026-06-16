/**
 * OpenAPI contract naming constants.
 *
 * These are the expected public schema names and operation IDs that
 * the generated spec must contain. The validator uses these to detect
 * accidental removal or renaming of public contract entries.
 */

/**
 * Expected top-level component schema names in the generated OpenAPI document.
 * These correspond to the `title` field in each contract's `.openapi()` call.
 */
export const EXPECTED_SCHEMA_NAMES = [
  // Config
  'Config',
  'ConfigSettings',
  'ConfigImage',
  'ConfigNavigationGroup',
  'ConfigNavigationItem',
  'ConfigGenre',

  // News
  'News',
  'NewsConnection',

  // Episodes
  'Episodes',
  'Episode',
  'EpisodeKind',
  'EpisodeTitle',
  'EpisodeThemes',
  'EpisodeQuery',

  // Series
  'Series',
  'SeriesId',
  'SeriesTitle',
  'SeriesScheduleEpisode',
  'SeriesSchedule',
  'SeriesNetwork',
  'SeriesImageAttributes',
  'SeriesTrailer',
  'SeriesCoverImage',
  'Media',
  'MangaMetadata',
  'AnimeMetadata',
  'AnimeThemes',
  'AnimeThemesAudio',
  'AnimeThemesVideo',
  'AnimeThemesEntry',
  'AnimeThemesSong',

  // Studio
  'Studio',
  'StudioTitle',

  // People
  'Person',

  // Character
  'Character',
  'CharacterMediaRelation',
  'CharacterVoiceRelation',
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
