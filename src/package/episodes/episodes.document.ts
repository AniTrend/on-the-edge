import { Document } from 'mongodb';
import { MergedEpisode } from './episodes.types.ts';
import { Instant } from '@scope/common/utils';

/**
 * Episode document stored in MongoDB.
 * Represents cached episode data with TTL-based expiry.
 *
 * Storage Strategy:
 * - One document per series
 * - Contains all episodes with merge metadata
 * - TTL varies by airing status (12h vs 168h)
 */
export type EpisodeDocument = Document & {
  /** Series key (typically MAL ID as string) */
  seriesKey: string;

  /** Merged episode data with source tracking */
  episodes: MergedEpisode[];

  /** Whether series is currently airing (affects TTL) */
  airing: boolean;

  /** Last update timestamp (epoch seconds) */
  updatedAt: Instant;

  /** Persisted merge statistics (single source of truth for diagnostics) */
  stats?: {
    total: number;
    sources: string[];
    conflicts: number;
    orphans: number;
    remapped: number;
    perSourceCounts?: Record<string, number>;
    remapSources?: string[];
  };

  /** Title similarity threshold used during merge (if any) */
  titleSimThreshold?: number | null;
};
