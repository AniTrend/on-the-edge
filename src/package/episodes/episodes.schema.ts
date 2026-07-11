import { z } from 'zod';
import { EpisodeKindContract } from './episodes.contract.ts';

/**
 * Episode kind taxonomy
 */
export const EpisodeKindSchema = z.enum([
  'MAIN',
  'OVA',
  'ONA',
  'RECAP',
  'FILLER',
  'SPECIAL',
]);

/**
 * Multi-language episode title
 */
export const EpisodeTitleSchema = z.object({
  english: z.string().nullish(),
  romanji: z.string().nullish(),
  native: z.string().nullish(),
});

/**
 * Theme songs for an episode (openings/endings)
 */
export const EpisodeThemesSchema = z.object({
  openings: z.array(z.string()).default([]),
  endings: z.array(z.string()).default([]),
});

/**
 * Canonical episode from primary source (Jikan).
 * Represents the merged, normalized episode data ready for client consumption.
 */
export const EpisodeCanonicalSchema = z.object({
  id: z.number(),
  number: z.number().nullish(),
  title: EpisodeTitleSchema.nullish(),
  synopsis: z.string().nullish(),
  aired: z.number().nullish(), // Instant (epoch seconds)
  score: z.number().nullish(),
  kind: EpisodeKindContract.nullish(),
  duration: z.number().nullish(), // minutes
  url: z.string().nullish(),
  // Provider IDs (populated during merge)
  tvdbShowId: z.number().nullish(),
  tvdbId: z.number().nullish(),
  tmdbId: z.number().nullish(),
  seasonNumber: z.number().nullish(),
  episodeNumber: z.number().nullish(),
  absoluteEpisodeNumber: z.number().nullish(),
  airedBeforeSeasonNumber: z.number().nullish(),
  airedBeforeEpisodeNumber: z.number().nullish(),
  airedAfterSeasonNumber: z.number().nullish(),
  airedAfterEpisodeNumber: z.number().nullish(),
  image: z.string().nullish(),
  poster: z.string().nullish(),
  themes: EpisodeThemesSchema.default({ openings: [], endings: [] }),
});

/**
 * Source type for multi-source aggregation
 */
export const SourceTypeSchema = z.enum([
  'JIKAN',
  'SKYHOOK',
  'TMDB',
  'TRAKT',
  'NOTIFY',
  'THEMES',
]);

/**
 * Conflict reasons during merge
 */
export const ConflictReasonSchema = z.enum([
  'TITLE',
  'DURATION',
  'AIR_DATE',
  'ORPHAN',
]);

/**
 * Merged episode with source tracking and conflict detection.
 * Internal format used during aggregation - stripped before API response.
 */
export const MergedEpisodeSchema = EpisodeCanonicalSchema.extend({
  sources: z.array(SourceTypeSchema),
  conflictReasons: z.array(ConflictReasonSchema).optional(),
  alignmentKey: z.object({
    num: z.number(),
    day: z.number().optional(),
    kind: EpisodeKindContract.optional(),
    season: z.number().optional(),
  }).optional(),
});

/**
 * Query parameters for episode listing with cursor pagination
 */
export const EpisodeQuerySchema = z.object({
  malId: z.coerce.number().int().positive(),
  limit: z.coerce.number().int().min(1).max(100).default(25).optional(),
  after: z.string().optional(), // EntityCursor (opaque)
  before: z.string().optional(), // EntityCursor (opaque)
  kind: EpisodeKindContract.optional(),
  specialsOnly: z.coerce.boolean().optional(),
  start: z.coerce.number().int().positive().optional(),
  end: z.coerce.number().int().positive().optional(),
  includeOrphans: z.coerce.boolean().optional(),
});

/**
 * Paginated episodes response with cursor navigation
 */
export const EpisodesContainerSchema = z.object({
  data: z.array(EpisodeCanonicalSchema), // Return canonical (strip merge metadata)
  first: z.string().nullish(),
  last: z.string().nullish(),
  count: z.number(),
  total: z.number(),
});
