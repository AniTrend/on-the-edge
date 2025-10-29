import type { MergedEpisode } from '../../episodes.types.ts';
import type { ConflictReason } from '../../aggregator/types.ts';

/**
 * Statistics helpers for merge operation diagnostics.
 *
 * Provides aggregate statistics about merge quality and conflicts.
 */

/**
 * Merge statistics summary.
 */
export interface MergeStats {
  totalEpisodes: number;
  episodesWithConflicts: number;
  conflictsByReason: Record<ConflictReason, number>;
  episodesBySource: Record<string, number>;
  averageSourcesPerEpisode: number;
}

/**
 * Calculate merge statistics from merged episodes.
 *
 * @param episodes Array of merged episodes
 * @returns Aggregate statistics
 */
export function calculateMergeStats(episodes: MergedEpisode[]): MergeStats {
  const conflictsByReason: Record<ConflictReason, number> = {
    title_mismatch: 0,
    number_mismatch: 0,
    aired_mismatch: 0,
    duration_mismatch: 0,
    kind_mismatch: 0,
  };

  const episodesBySource: Record<string, number> = {};
  let totalSources = 0;
  let episodesWithConflicts = 0;

  for (const episode of episodes) {
    // Count conflicts
    if (episode.conflictReasons && episode.conflictReasons.length > 0) {
      episodesWithConflicts++;
      for (const reason of episode.conflictReasons) {
        if (reason in conflictsByReason) {
          conflictsByReason[reason as ConflictReason]++;
        }
      }
    }

    // Count sources
    totalSources += episode.sources.length;
    for (const source of episode.sources) {
      episodesBySource[source] = (episodesBySource[source] || 0) + 1;
    }
  }

  return {
    totalEpisodes: episodes.length,
    episodesWithConflicts,
    conflictsByReason,
    episodesBySource,
    averageSourcesPerEpisode: episodes.length > 0
      ? totalSources / episodes.length
      : 0,
  };
}
