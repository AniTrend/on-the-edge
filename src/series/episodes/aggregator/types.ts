import { EpisodeCanonical } from '../episodes.types.ts';

// Source tags for provenance tracking
export type EpisodeSource =
  | 'JIKAN'
  | 'SKYHOOK'
  | 'TMDB'
  | 'TRAKT'
  | 'NOTIFY'
  | 'THEMES'
  | 'THDEXEM';

export interface EpisodeSourceSlice {
  source: EpisodeSource;
  episodes: EpisodeCanonical[]; // normalized per-source slice
}

export interface MergeContext {
  // future: relation ids, mapping hints, conflict resolution options
  preferRuntime: 'SKYHOOK' | 'TMDB' | 'TRAKT' | 'JIKAN';
  /** Optional title similarity threshold (0..1) to enable fuzzy title alignment fallback */
  titleSimThreshold?: number;
}

export interface MergedEpisode extends EpisodeCanonical {
  sources?: EpisodeSource[]; // which sources contributed
  alignmentKey?: { num?: number; day?: number; kind?: string };
  conflictReasons?: ConflictReason[];
}

export interface MergeResult {
  episodes: MergedEpisode[];
}

export type ConflictReason = 'TITLE' | 'DURATION' | 'AIR_DATE' | 'ORPHAN';
