import type { SourceType } from '../../aggregator/types.ts';

/**
 * Source prioritization helpers for conflict resolution.
 *
 * Defines which source takes precedence when merging conflicting episode metadata.
 */

/**
 * Source priority order (higher index = higher priority).
 * Used for conflict resolution during merge.
 */
const SOURCE_PRIORITY: SourceType[] = [
  'THEMES',
  'NOTIFY',
  'TRAKT',
  'SKYHOOK',
  'TMDB',
  'JIKAN', // Highest priority
];

/**
 * Get priority score for a source (higher = more authoritative).
 *
 * @param source Source identifier
 * @returns Priority score
 */
export function getSourcePriority(source: SourceType): number {
  const index = SOURCE_PRIORITY.indexOf(source);
  return index === -1 ? 0 : index + 1;
}

/**
 * Select winning value from multiple sources based on priority.
 *
 * @param values Map of source to value
 * @returns Value from highest priority source
 */
export function selectByPriority<T>(
  values: Map<SourceType, T>,
): T | undefined {
  let bestSource: SourceType | null = null;
  let bestPriority = -1;

  for (const [source] of values) {
    const priority = getSourcePriority(source);
    if (priority > bestPriority) {
      bestPriority = priority;
      bestSource = source;
    }
  }

  return bestSource ? values.get(bestSource) : undefined;
}
