import { ConflictReason, EpisodeKind, SourceType } from '../episodes.types.ts';

/**
 * Types for multi-source episode aggregation.
 *
 * These types support the merge algorithm and conflict resolution logic.
 * Uses schema-derived enums from episodes.schema.ts for type safety.
 */

// Re-export schema-derived types for aggregator use
export type { ConflictReason, SourceType };

/**
 * Match result from Dice coefficient title comparison.
 */
export interface TitleMatch {
  sourceA: string;
  sourceB: string;
  episodeIdA: number;
  episodeIdB: number;
  score: number;
  matched: boolean;
}

/**
 * Alignment key for TheXem episode normalization.
 */
export interface AlignmentKey {
  num: number;
  day: number | null;
  kind: EpisodeKind | null;
}
