import type { AlignmentKey } from '../../aggregator/types.ts';
import type { MergedEpisode } from '../../episodes.types.ts';

/**
 * TheXem normalization helpers for cross-source episode numbering.
 *
 * TheXem provides mappings between different episode numbering schemes
 * (e.g., TVDB scene numbering vs absolute numbering).
 */

/**
 * Normalize episode numbering using TheXem mappings.
 *
 * @param episodes Array of merged episodes
 * @param xemMappings TheXem mapping data
 * @returns Episodes with normalized numbering
 */
export function normalizeEpisodeNumbering(
  episodes: MergedEpisode[],
  _xemMappings: unknown[], // TODO Phase 4: Type TheXem response
): MergedEpisode[] {
  // TODO Phase 4: Implement TheXem normalization
  // 1. Parse XEM mappings
  // 2. Apply scene/absolute number conversions
  // 3. Update seasonNumber/episodeNumber fields
  // 4. Preserve original numbering in alignmentKey

  // Placeholder: return episodes unchanged
  return episodes;
}

/**
 * Create alignment key for episode matching across numbering schemes.
 *
 * @param episode Episode to create key for
 * @returns Alignment key (num, day, kind)
 */
export function createAlignmentKey(
  _episode: MergedEpisode,
): AlignmentKey | null {
  // TODO Phase 4: Implement alignment key generation
  // Used for matching episodes when TheXem provides conflicting numbering

  return null;
}
