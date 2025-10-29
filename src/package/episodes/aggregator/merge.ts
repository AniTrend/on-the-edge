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
 * Merge episode data from multiple sources.
 *
 * Algorithm:
 * 1. Select primary source (prefer ctx.preferRuntime, fallback to first slice)
 * 2. Index primary episodes by number
 * 3. For each secondary slice:
 *    a. Try direct number match
 *    b. Try air date proximity (±2 days)
 *    c. Try fuzzy title match (if threshold enabled)
 *    d. Mark as orphan if no match
 * 4. Track conflicts (title, duration, air date)
 * 5. Enrich fields per source priority
 * 6. Sort by alignment number
 *
 * @param ctx Merge configuration
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
      },
    });
  }

  let orphans = 0;

  // 3. Process secondary slices
  for (const slice of secondarySlices) {
    for (const secondary of slice.episodes) {
      const secNum = epNum(secondary);
      let matched = false;

      // 3a. Try direct number match
      if (merged.has(secNum)) {
        const existing = merged.get(secNum)!;
        existing.sources.push(slice.source);
        const conflicts = detectConflicts(existing, secondary);
        if (conflicts.length > 0) {
          existing.conflictReasons = [
            ...(existing.conflictReasons || []),
            ...conflicts,
          ];
        }
        // Enrich fields (prefer non-null from secondary)
        if (secondary.synopsis && !existing.synopsis) {
          existing.synopsis = secondary.synopsis;
        }
        if (secondary.duration && !existing.duration) {
          existing.duration = secondary.duration;
        }
        if (secondary.image && !existing.image) {
          existing.image = secondary.image;
        }
        if (secondary.poster && !existing.poster) {
          existing.poster = secondary.poster;
        }
        matched = true;
      }

      // 3b. Try air date proximity (±2 days)
      if (!matched) {
        const secDay = toDay(secondary.aired);
        if (secDay != null) {
          for (const [_num, existing] of merged) {
            const primDay = existing.alignmentKey?.day;
            if (primDay != null && Math.abs(secDay - primDay) <= 2) {
              existing.sources.push(slice.source);
              existing.conflictReasons?.push('AIR_DATE');
              matched = true;
              break;
            }
          }
        }
      }

      // 3c. Try fuzzy title match (if threshold enabled)
      if (!matched && ctx.titleSimThreshold != null) {
        const secTitle = normTitle(secondary);
        if (secTitle) {
          let bestMatch: { num: number; score: number } | null = null;
          for (const [num, existing] of merged) {
            const primTitle = normTitle(existing);
            if (primTitle) {
              const score = diceCoefficient(primTitle, secTitle);
              if (
                score >= ctx.titleSimThreshold &&
                (!bestMatch || score > bestMatch.score)
              ) {
                bestMatch = { num, score };
              }
            }
          }
          if (bestMatch) {
            const existing = merged.get(bestMatch.num)!;
            existing.sources.push(slice.source);
            existing.conflictReasons?.push('TITLE');
            matched = true;
          }
        }
      }

      // 3d. Mark as orphan if no match
      if (!matched) {
        orphans++;
        merged.set(secNum, {
          ...secondary,
          sources: [slice.source],
          conflictReasons: ['ORPHAN'],
          alignmentKey: {
            num: secNum,
            day: toDay(secondary.aired) ?? undefined,
            kind: secondary.kind ?? undefined,
          },
        });
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
    },
  };
}
