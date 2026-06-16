import { z } from '@scope/common/openapi';

/**
 * Episode kind taxonomy
 */
export const EpisodeKindContract = z.enum([
  'main',
  'ova',
  'ona',
  'recap',
  'filler',
  'special',
]).openapi({
  title: 'EpisodeKind',
  description: 'Episode type classification',
  example: 'main',
});

/**
 * Multi-language episode title
 */
export const EpisodeTitleContract = z.object({
  english: z.string().nullable().optional(),
  romanji: z.string().nullable().optional(),
  native: z.string().nullable().optional(),
}).openapi({
  title: 'EpisodeTitle',
  description: 'Multi-language episode title',
});

/**
 * Theme songs for an episode (openings/endings)
 */
export const EpisodeThemesContract = z.object({
  openings: z.array(z.string()).default([]),
  endings: z.array(z.string()).default([]),
}).openapi({
  title: 'EpisodeThemes',
  description: 'Opening and ending theme songs',
});

/**
 * Canonical episode from primary source (Jikan).
 * Represents the merged, normalized episode data ready for client consumption.
 */
export const EpisodeContract = z.object({
  id: z.number(),
  number: z.number().nullable().optional(),
  title: EpisodeTitleContract.nullable().optional(),
  synopsis: z.string().nullable().optional(),
  aired: z.number().nullable().optional(), // Instant (epoch seconds)
  score: z.number().nullable().optional(),
  kind: EpisodeKindContract.nullable().optional(),
  duration: z.number().nullable().optional(), // minutes
  url: z.string().nullable().optional(),
  // Provider IDs (populated during merge)
  tvdbShowId: z.number().nullable().optional(),
  tvdbId: z.number().nullable().optional(),
  tmdbId: z.number().nullable().optional(),
  seasonNumber: z.number().nullable().optional(),
  episodeNumber: z.number().nullable().optional(),
  absoluteEpisodeNumber: z.number().nullable().optional(),
  airedBeforeSeasonNumber: z.number().nullable().optional(),
  airedBeforeEpisodeNumber: z.number().nullable().optional(),
  airedAfterSeasonNumber: z.number().nullable().optional(),
  airedAfterEpisodeNumber: z.number().nullable().optional(),
  image: z.string().nullable().optional(),
  poster: z.string().nullable().optional(),
  themes: EpisodeThemesContract.default({ openings: [], endings: [] }),
}).openapi({
  title: 'Episode',
  description: 'Canonical episode data from multiple sources',
});

/**
 * Paginated episodes response with cursor navigation
 */
export const EpisodesContract = z.object({
  data: z.array(EpisodeContract),
  first: z.string().nullable().optional(),
  last: z.string().nullable().optional(),
  count: z.number(),
  total: z.number(),
}).openapi({
  title: 'Episodes',
  description: 'Paginated episode listing with cursor navigation',
});
