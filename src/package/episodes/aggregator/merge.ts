import type {
  EpisodeCanonical,
  MergedEpisode,
  SourceType,
} from '../episodes.types.ts';
import type { ConflictReason } from '../episodes.types.ts';

/**
 * Merge context configuration
 */
export interface MergeContext {
  /** Preferred runtime source (e.g., 'JIKAN') */
  preferRuntime: SourceType;
  /** Title similarity threshold (0.0-1.0), null to disable fuzzy matching */
  titleSimThreshold: number | null;
  /** Include orphaned episodes from secondary sources (default: false) */
  includeOrphans?: boolean;
}

/**
 * Episode data from a single source
 */
export interface EpisodeSourceSlice {
  source: SourceType;
  episodes: EpisodeCanonical[];
  remapped: number;
}

/**
 * Merge result with statistics
 */
export interface MergeResult {
  episodes: MergedEpisode[];
  stats: {
    total: number;
    sources: SourceType[];
    conflicts: number;
    orphans: number;
    remapped: number;
    perSourceCounts?: Partial<Record<SourceType, number>>;
    remapSources?: SourceType[];
    unmatchedBySource?: Partial<Record<SourceType, number>>;
    seasonMismatches?: number;
  };
}

/**
 * Bigram set for Dice coefficient calculation
 */
function bigrams(str: string): Set<string> {
  const normalized = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  const set = new Set<string>();
  for (let i = 0; i < normalized.length - 1; i++) {
    set.add(normalized.slice(i, i + 2));
  }
  return set;
}

/**
 * Calculate Dice coefficient for title similarity (0.0 - 1.0)
 * Higher score = more similar
 *
 * @param titleA First title string
 * @param titleB Second title string
 * @returns Similarity score between 0.0 and 1.0
 */
export function diceCoefficient(titleA: string, titleB: string): number {
  if (!titleA || !titleB) return 0;
  if (titleA === titleB) return 1;

  const setA = bigrams(titleA);
  const setB = bigrams(titleB);

  if (setA.size === 0 || setB.size === 0) return 0;

  // Count intersections
  let intersection = 0;
  for (const bigram of setA) {
    if (setB.has(bigram)) intersection++;
  }

  // Dice = 2 * |A ∩ B| / (|A| + |B|)
  return (2 * intersection) / (setA.size + setB.size);
}

/**
 * Normalize title for comparison (prefer romanji > english > native)
 */
function normTitle(ep: EpisodeCanonical): string {
  return ep.title?.romanji || ep.title?.english || ep.title?.native || '';
}

/**
 * Convert epoch seconds to day bucket for date proximity matching
 */
function toDay(instant: number | null | undefined): number | null {
  if (instant == null) return null;
  return Math.floor(instant / 86400); // 86400 seconds per day
}

/**
 * Extract alignment number (prefer number field else id)
 */
function epNum(ep: EpisodeCanonical): number {
  return ep.number ?? ep.id;
}

/**
 * Check if two episodes can be matched based on season compatibility.
 * Prevents cross-season pollution (e.g., Season 3 matching Season 0 specials).
 *
 * @param primarySeason Season number from primary source (may be undefined if JIKAN)
 * @param secondarySeason Season number from secondary source
 * @param primaryKind Episode kind from primary source
 * @param secondaryKind Episode kind from secondary source
 * @returns true if episodes can be matched, false otherwise
 */
function canMatchSeasons(
  primarySeason: number | null | undefined,
  secondarySeason: number | null | undefined,
  primaryKind: string | null | undefined,
  secondaryKind: string | null | undefined,
): boolean {
  // If secondary has no season info, allow match (graceful degradation)
  if (secondarySeason == null) return true;

  // Special episodes (season 0) should only match other specials
  const secIsSpecial = secondarySeason === 0 || secondaryKind === 'SPECIAL';
  const primIsSpecial = primarySeason === 0 || primaryKind === 'SPECIAL';

  if (secIsSpecial !== primIsSpecial) {
    return false; // Don't match specials with regular episodes
  }

  // If both have season info, they must match exactly
  if (primarySeason != null && secondarySeason != null) {
    return primarySeason === secondarySeason;
  }

  // If primary lacks season (JIKAN), allow match but rely on other signals
  return true;
}

/**
 * Detect conflicts between two episodes
 */
function detectConflicts(
  primary: EpisodeCanonical,
  secondary: EpisodeCanonical,
): ConflictReason[] {
  const conflicts: ConflictReason[] = [];

  // Title mismatch (if both have titles and Dice < 0.7)
  const titleA = normTitle(primary);
  const titleB = normTitle(secondary);
  if (titleA && titleB && diceCoefficient(titleA, titleB) < 0.7) {
    conflicts.push('TITLE');
  }

  // Duration mismatch (>10% difference)
  if (
    primary.duration != null && secondary.duration != null &&
    Math.abs(primary.duration - secondary.duration) > primary.duration * 0.1
  ) {
    conflicts.push('DURATION');
  }

  // Air date mismatch (>2 days difference)
  const dayA = toDay(primary.aired);
  const dayB = toDay(secondary.aired);
  if (dayA != null && dayB != null && Math.abs(dayA - dayB) > 2) {
    conflicts.push('AIR_DATE');
  }

  return conflicts;
}

/**
 * Merge episode data from multiple sources with JIKAN as source of truth.
 *
 * Algorithm:
 * 1. Select primary source (prefer ctx.preferRuntime, fallback to first slice)
 * 2. Index primary episodes by number
 * 3. For each secondary slice episode:
 *    a. PRIORITY 1: Try fuzzy title match (Dice coefficient with threshold)
 *    b. FALLBACK 1: Try air date proximity (±2 days) with season guard
 *    c. FALLBACK 2: Try direct number match with season guard
 *    d. Mark as orphan if no match
 * 4. Season-aware matching prevents cross-season pollution:
 *    - Specials (season 0) only match other specials
 *    - Regular episodes only match within same season (when season data available)
 * 5. Track conflicts (title, duration, air date)
 * 6. Enrich fields per source priority (synopsis, duration, images, provider IDs)
 * 7. Sort by alignment number
 *
 * @param ctx Merge configuration with title similarity threshold
 * @param slices Episode data from multiple sources
 * @returns Merged episodes with source tracking and conflict detection
 */
export function mergeEpisodes(
  ctx: MergeContext,
  slices: EpisodeSourceSlice[],
): MergeResult {
  if (slices.length === 0) {
    return {
      episodes: [],
      stats: { total: 0, sources: [], conflicts: 0, orphans: 0, remapped: 0 },
    };
  }

  // 1. Select primary source
  const primarySlice = slices.find((s) => s.source === ctx.preferRuntime) ||
    slices[0];
  const secondarySlices = slices.filter((s) => s !== primarySlice);

  // 2. Index primary episodes by number
  const merged = new Map<number, MergedEpisode>();
  for (const ep of primarySlice.episodes) {
    const num = epNum(ep);
    merged.set(num, {
      ...ep,
      sources: [primarySlice.source],
      conflictReasons: [],
      alignmentKey: {
        num,
        day: toDay(ep.aired) ?? undefined,
        kind: ep.kind ?? undefined,
        season: ep.seasonNumber ?? undefined,
      },
    });
  }

  let orphans = 0;
  let seasonMismatches = 0;
  const unmatchedBySource = new Map<SourceType, number>();

  // 3. Process secondary slices
  for (const slice of secondarySlices) {
    for (const secondary of slice.episodes) {
      const secNum = epNum(secondary);
      let matched = false;
      let matchedEpisode: MergedEpisode | null = null;

      // 3a. PRIORITY 1: Try fuzzy title match (if threshold enabled)
      // Title matching is most reliable for cross-source alignment
      if (!matched && ctx.titleSimThreshold != null) {
        const secTitle = normTitle(secondary);
        if (secTitle) {
          let bestMatch:
            | { num: number; score: number; episode: MergedEpisode }
            | null = null;
          for (const [num, existing] of merged) {
            const primTitle = normTitle(existing);
            if (primTitle) {
              const score = diceCoefficient(primTitle, secTitle);
              if (
                score >= ctx.titleSimThreshold &&
                (!bestMatch || score > bestMatch.score)
              ) {
                // Check season compatibility before accepting match
                if (
                  canMatchSeasons(
                    existing.seasonNumber,
                    secondary.seasonNumber,
                    existing.kind,
                    secondary.kind,
                  )
                ) {
                  bestMatch = { num, score, episode: existing };
                } else {
                  // High title similarity but season boundary violation
                  seasonMismatches++;
                }
              }
            }
          }
          if (bestMatch) {
            matchedEpisode = bestMatch.episode;
            matched = true;
          }
        }
      }

      // 3b. FALLBACK 1: Try air date proximity (±2 days)
      if (!matched) {
        const secDay = toDay(secondary.aired);
        if (secDay != null) {
          for (const [_num, existing] of merged) {
            const primDay = existing.alignmentKey?.day;
            if (primDay != null && Math.abs(secDay - primDay) <= 2) {
              // Check season compatibility
              if (
                canMatchSeasons(
                  existing.seasonNumber,
                  secondary.seasonNumber,
                  existing.kind,
                  secondary.kind,
                )
              ) {
                matchedEpisode = existing;
                existing.conflictReasons?.push('AIR_DATE');
                matched = true;
                break;
              }
            }
          }
        }
      }

      // 3c. FALLBACK 2: Try direct number match (with season guard)
      if (!matched && merged.has(secNum)) {
        const existing = merged.get(secNum)!;
        // Check season compatibility before matching by number
        if (
          canMatchSeasons(
            existing.seasonNumber,
            secondary.seasonNumber,
            existing.kind,
            secondary.kind,
          )
        ) {
          matchedEpisode = existing;
          matched = true;
        }
      }

      // If matched, enrich the existing episode with secondary data
      if (matched && matchedEpisode) {
        matchedEpisode.sources.push(slice.source);
        const conflicts = detectConflicts(matchedEpisode, secondary);
        if (conflicts.length > 0) {
          matchedEpisode.conflictReasons = [
            ...(matchedEpisode.conflictReasons || []),
            ...conflicts,
          ];
        }
        // Enrich fields (prefer non-null from secondary)
        if (secondary.synopsis && !matchedEpisode.synopsis) {
          matchedEpisode.synopsis = secondary.synopsis;
        }
        if (secondary.duration && !matchedEpisode.duration) {
          matchedEpisode.duration = secondary.duration;
        }
        if (secondary.image && !matchedEpisode.image) {
          matchedEpisode.image = secondary.image;
        }
        if (secondary.poster && !matchedEpisode.poster) {
          matchedEpisode.poster = secondary.poster;
        }
        // Enrich provider IDs from secondary sources
        if (secondary.tvdbShowId && !matchedEpisode.tvdbShowId) {
          matchedEpisode.tvdbShowId = secondary.tvdbShowId;
        }
        if (secondary.tvdbId && !matchedEpisode.tvdbId) {
          matchedEpisode.tvdbId = secondary.tvdbId;
        }
        if (secondary.tmdbId && !matchedEpisode.tmdbId) {
          matchedEpisode.tmdbId = secondary.tmdbId;
        }
        // Enrich season/episode numbers if primary lacks them
        if (
          secondary.seasonNumber != null && matchedEpisode.seasonNumber == null
        ) {
          matchedEpisode.seasonNumber = secondary.seasonNumber;
        }
        if (
          secondary.episodeNumber != null &&
          matchedEpisode.episodeNumber == null
        ) {
          matchedEpisode.episodeNumber = secondary.episodeNumber;
        }
        if (
          secondary.absoluteEpisodeNumber != null &&
          matchedEpisode.absoluteEpisodeNumber == null
        ) {
          matchedEpisode.absoluteEpisodeNumber =
            secondary.absoluteEpisodeNumber;
        }
      }

      // 3d. Mark as orphan if no match
      if (!matched) {
        orphans++;
        unmatchedBySource.set(
          slice.source,
          (unmatchedBySource.get(slice.source) ?? 0) + 1,
        );
        // Only add orphaned secondary episodes if explicitly requested
        if (ctx.includeOrphans === true) {
          merged.set(secNum, {
            ...secondary,
            sources: [slice.source],
            conflictReasons: ['ORPHAN'],
            alignmentKey: {
              num: secNum,
              day: toDay(secondary.aired) ?? undefined,
              kind: secondary.kind ?? undefined,
              season: secondary.seasonNumber ?? undefined,
            },
          });
        }
      }
    }
  }

  // 6. Sort by alignment number
  const sortedEpisodes = Array.from(merged.values()).sort((a, b) => {
    const numA = a.alignmentKey?.num ?? a.id;
    const numB = b.alignmentKey?.num ?? b.id;
    return numA - numB;
  });

  // Calculate statistics
  const sources = new Set<SourceType>();
  let conflictCount = 0;
  const perSourceCounts = new Map<SourceType, number>();
  for (const ep of sortedEpisodes) {
    for (const src of ep.sources) {
      sources.add(src);
      perSourceCounts.set(src, (perSourceCounts.get(src) ?? 0) + 1);
    }
    if (ep.conflictReasons && ep.conflictReasons.length > 0) conflictCount++;
  }

  const remapSources = Array.from(
    new Set(slices.filter((s) => (s.remapped ?? 0) > 0).map((s) => s.source)),
  );

  return {
    episodes: sortedEpisodes,
    stats: {
      total: sortedEpisodes.length,
      sources: Array.from(sources),
      conflicts: conflictCount,
      orphans,
      remapped: slices.reduce((acc, s) => acc + (s.remapped ?? 0), 0),
      perSourceCounts: Object.fromEntries(perSourceCounts.entries()),
      remapSources,
      unmatchedBySource: unmatchedBySource.size > 0
        ? Object.fromEntries(unmatchedBySource.entries())
        : undefined,
      seasonMismatches: seasonMismatches > 0 ? seasonMismatches : undefined,
    },
  };
}
