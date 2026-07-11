import { z } from 'zod';
import {
  ConflictReasonSchema,
  EpisodeCanonicalSchema,
  EpisodeKindSchema,
  EpisodeQuerySchema,
  EpisodesContainerSchema,
  EpisodeThemesSchema,
  EpisodeTitleSchema,
  MergedEpisodeSchema,
  SourceTypeSchema,
} from './episodes.schema.ts';
import { Instant } from '@scope/common/utils';
import { SeriesRelationId } from '@scope/service/arm';
import { EntityCursor } from '@scope/database';

// Infer types from schemas (single source of truth)
export type EpisodeKind = z.infer<typeof EpisodeKindSchema>;
export type EpisodeTitle = z.infer<typeof EpisodeTitleSchema>;
export type EpisodeThemes = z.infer<typeof EpisodeThemesSchema>;
export type EpisodeCanonical = z.infer<typeof EpisodeCanonicalSchema>;
export type SourceType = z.infer<typeof SourceTypeSchema>;
export type ConflictReason = z.infer<typeof ConflictReasonSchema>;
export type MergedEpisode = z.infer<typeof MergedEpisodeSchema>;
export type EpisodeQuery = z.infer<typeof EpisodeQuerySchema>;
export type EpisodesContainer = z.infer<typeof EpisodesContainerSchema>;

/**
 * TODO: replace with `EntityCursor` from `@scope/database`
 *
 * Opaque cursor for pagination.
 * Base64-encoded JSON containing position and filter hash.
 *
 * @deprecated
 */
export type EpisodeCursor = string;

/**
 * Internal cursor payload structure.
 * Not exposed to clients - encoded as EpisodeCursor string.
 */
export interface EpisodeCursorPayload {
  /** Zero-based index position in canonical ordered list */
  pos: number;

  /** Hash of filter criteria to invalidate stale cursors */
  hash: string;
}

/**
 * Episode filters for narrowing results
 */
export interface EpisodeFilters {
  /** Filter by episode kind (MAIN, OVA, SPECIAL, etc.) */
  kind?: EpisodeKind;

  /** Show only special episodes (ova, ona, special) */
  specialsOnly?: boolean;

  /** Filter episodes starting from this number */
  start?: number;

  /** Filter episodes up to this number */
  end?: number;

  /** Include orphaned episodes from secondary sources */
  includeOrphans?: boolean;
}

/**
 * Complete episodes response with optional diagnostics
 */
export interface EpisodesDataResponse extends EpisodesContainer {
  /** Optional diagnostic information for debugging */
  diagnostics?: {
    /** Source data provenance */
    sources?: string[];

    /** Merge statistics */
    mergeStats: {
      /** Episodes remapped via TheXem */
      xemRemapped?: number;

      /** Title similarity threshold used */
      titleSimThreshold?: number | null;

      /** Episodes contribution per source */
      perSourceCounts?: Partial<Record<string, number>>;

      /** Which sources contributed to remaps */
      remapSources?: string[];

      /** Unmatched episodes by source (orphans) */
      unmatchedBySource?: Partial<Record<string, number>>;

      /** Season boundary violations (high title sim but wrong season) */
      seasonMismatches?: number;
    };

    /** Cache status */
    cached?: boolean;

    /** Data freshness */
    updatedAt?: Instant;
  };
}

/**
 * Repository options for fetching episodes
 */
export interface EpisodesRepositoryOptions {
  /** Forward pagination cursor */
  after?: EntityCursor;

  /** Backward pagination cursor */
  before?: EntityCursor;

  /** Page size (clamped to max limit) */
  limit: number;

  /** Optional filters to apply */
  filters?: EpisodeFilters;

  /** Series relation IDs for multi-source enrichment */
  relation?: SeriesRelationId;
}
