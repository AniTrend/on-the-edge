import { EpisodeCanonical } from '../episodes.types.ts';
import {
  ConflictReason,
  EpisodeSourceSlice,
  MergeContext,
  MergedEpisode,
  MergeResult,
} from './types.ts';

// Simple normalization for title comparison (lowercase & strip non-alphanumerics)
const norm = (t: string | null) =>
  t?.toLowerCase().replace(/[^a-z0-9]+/g, '') ?? '';

// Prefer romanji, then english, then native when comparing titles
const normTitle = (
  title: EpisodeCanonical['title'] | null | undefined,
): string => {
  if (!title) return '';
  const raw = title.romanji ?? title.english ?? title.native ?? null;
  return norm(raw);
};

// Bigram Dice coefficient similarity for normalized strings
// Uses memoization to cache bigram generation for improved performance
const dice = (() => {
  // Simple LRU-style cache for bigram maps (max 100 entries to prevent memory bloat)
  const cache = new Map<string, Map<string, number>>();
  const MAX_CACHE_SIZE = 100;

  const grams = (s: string): Map<string, number> => {
    if (cache.has(s)) return cache.get(s)!;

    const m = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.substring(i, i + 2);
      m.set(g, (m.get(g) ?? 0) + 1);
    }

    // Simple cache size management: clear oldest entries when limit exceeded
    if (cache.size >= MAX_CACHE_SIZE) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(s, m);
    return m;
  };

  return (a: string, b: string): number => {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;

    const A = grams(a), B = grams(b);
    let overlap = 0;
    for (const [g, c] of A) overlap += Math.min(c, B.get(g) ?? 0);
    const total = (a.length - 1) + (b.length - 1);
    return (2 * overlap) / total;
  };
})();

// Extract day bucket (UTC midnight) from Instant (seconds) as integer days since epoch
const toDay = (instant?: number | null): number | undefined =>
  typeof instant === 'number' && instant >= 0
    ? Math.floor((instant * 1000) / 86400000)
    : undefined;

// Build alignment number (prefer explicit number else fallback to id)
const epNum = (ep: EpisodeCanonical) => ep.number ?? ep.id;

export const mergeEpisodes = (
  ctx: MergeContext,
  slices: EpisodeSourceSlice[],
): MergeResult => {
  if (slices.length === 0) return { episodes: [] };

  // Primary (runtime-preferred) source first; fallback to JIKAN if not present
  const primary = slices.find((s) => s.source === ctx.preferRuntime) ||
    slices.find((s) => s.source === 'JIKAN') || slices[0];
  const primaryEpisodes = primary.episodes.slice().sort((a, b) =>
    epNum(a) - epNum(b)
  );

  // Index primary by number for fast lookup and prepare aux indexes for alignment fallback
  const index = new Map<number, MergedEpisode>();
  const primaryMeta: Array<
    { num: number; day?: number; ntitle?: string; ref: MergedEpisode }
  > = [];
  for (const ep of primaryEpisodes) {
    const num = epNum(ep);
    const ref: MergedEpisode = {
      ...ep,
      sources: [primary.source],
      alignmentKey: {
        num,
        day: toDay(ep.aired ?? undefined),
        kind: ep.kind ?? undefined,
      },
    };
    index.set(num, ref);
    primaryMeta.push({
      num,
      day: toDay(ep.aired ?? undefined),
      ntitle: normTitle(ep.title),
      ref,
    });
  }

  // Process secondary slices
  for (const slice of slices) {
    if (slice === primary) continue;
    for (const ep of slice.episodes) {
      const num = epNum(ep);
      let existing = index.get(num);
      if (!existing) {
        // Try alignment fallback: (1) nearest air-date day within tolerance, then (2) normalized title equality
        const day = toDay(ep.aired ?? undefined);
        const TOL_DAYS = 2;
        let candidate: MergedEpisode | undefined;
        if (day !== undefined) {
          let best: { ref: MergedEpisode; d: number; num: number } | undefined;
          for (const m of primaryMeta) {
            if (m.day === undefined) continue;
            const diff = Math.abs(m.day - day);
            if (diff <= TOL_DAYS) {
              if (
                !best || diff < best.d || (diff === best.d && m.num < best.num)
              ) {
                best = { ref: m.ref, d: diff, num: m.num };
              }
            }
          }
          candidate = best?.ref;
        }
        if (!candidate && ep.title) {
          const nt = normTitle(ep.title);
          // Prefer exact normalized title equality among primary
          let bestTitle:
            | { ref: MergedEpisode; num: number; dayDiff?: number }
            | undefined;
          for (const m of primaryMeta) {
            if (!m.ntitle || m.ntitle.length === 0) continue;
            if (m.ntitle === nt) {
              const dd = day !== undefined && m.day !== undefined
                ? Math.abs(m.day - day)
                : undefined;
              if (
                !bestTitle ||
                (dd !== undefined &&
                  (bestTitle.dayDiff === undefined ||
                    dd < bestTitle.dayDiff)) ||
                (dd === undefined && m.num < bestTitle.num)
              ) {
                bestTitle = { ref: m.ref, num: m.num, dayDiff: dd };
              }
            }
          }
          candidate = bestTitle?.ref;
          // Fallback: fuzzy title similarity (bigram Dice) if enabled
          if (!candidate && ctx.titleSimThreshold && nt) {
            const threshold = Math.max(0, Math.min(1, ctx.titleSimThreshold));
            let bestSim:
              | {
                ref: MergedEpisode;
                num: number;
                sim: number;
                dayDiff?: number;
              }
              | undefined;
            for (const m of primaryMeta) {
              if (!m.ntitle || m.ntitle.length === 0) continue;
              const sim = dice(nt, m.ntitle);
              if (sim >= threshold) {
                const dd = day !== undefined && m.day !== undefined
                  ? Math.abs(m.day - day)
                  : undefined;
                if (
                  !bestSim || sim > bestSim.sim ||
                  (sim === bestSim.sim &&
                    ((dd !== undefined &&
                      (bestSim.dayDiff === undefined ||
                        dd < bestSim.dayDiff)) ||
                      (dd === undefined && m.num < bestSim.num)))
                ) {
                  bestSim = { ref: m.ref, num: m.num, sim, dayDiff: dd };
                }
              }
            }
            candidate = bestSim?.ref;
          }
        }

        if (candidate) {
          existing = candidate;
        } else {
          // Orphan from this source; include directly keyed by its own num
          index.set(num, {
            ...ep,
            sources: [slice.source],
            alignmentKey: { num, day: day, kind: ep.kind ?? undefined },
            conflictReasons: ['ORPHAN'],
          });
          continue;
        }
      }
      // Already have a primary episode; merge source attribution
      if (!existing.sources?.includes(slice.source)) {
        existing.sources = [...(existing.sources ?? []), slice.source];
      }
      const conflicts: ConflictReason[] = existing.conflictReasons
        ? [...existing.conflictReasons]
        : [];
      // Title conflict detection
      if (
        ep.title && existing.title &&
        normTitle(ep.title) !== normTitle(existing.title)
      ) {
        if (!conflicts.includes('TITLE')) conflicts.push('TITLE');
      }
      // Duration conflict (threshold > 120s) when both durations present (convert minutes to seconds ~ heuristic: minutes diff >2)
      if (ep.duration != null && existing.duration != null) {
        if (Math.abs(ep.duration - existing.duration) > 2) {
          if (!conflicts.includes('DURATION')) conflicts.push('DURATION');
        }
      }
      // Air date drift (> 2 days) when both present
      if (ep.aired != null && existing.aired != null) {
        const driftDays = Math.abs(
          (toDay(ep.aired) ?? 0) - (toDay(existing.aired) ?? 0),
        );
        if (driftDays > 2 && !conflicts.includes('AIR_DATE')) {
          conflicts.push('AIR_DATE');
        }
      }
      if (conflicts.length) existing.conflictReasons = conflicts;

      // Field enrichment preferences
      // Never overwrite canonical numbering or primary title
      // Prefer runtime: TMDB > JIKAN > SKYHOOK/TRAKT
      if (slice.source === 'TMDB') {
        if (ep.duration != null) existing.duration = ep.duration;
        if (!existing.poster && ep.poster) existing.poster = ep.poster;
        if (!existing.image && ep.image) existing.image = ep.image;
        if (!existing.synopsis && ep.synopsis) existing.synopsis = ep.synopsis;
        if (existing.tmdbId == null && ep.tmdbId != null) {
          existing.tmdbId = ep.tmdbId;
        }
        if (existing.seasonNumber == null && ep.seasonNumber != null) {
          existing.seasonNumber = ep.seasonNumber;
        }
        if (existing.episodeNumber == null && ep.episodeNumber != null) {
          existing.episodeNumber = ep.episodeNumber;
        }
        if (existing.aired == null && ep.aired != null) {
          existing.aired = ep.aired;
        }
      } else if (slice.source === 'THEMES') {
        // Union themes
        const ensureUnique = (arr: string[]) =>
          Array.from(new Set(arr.filter(Boolean)));
        const openings = ensureUnique([
          ...(existing.themes?.openings ?? []),
          ...(ep.themes?.openings ?? []),
        ]);
        const endings = ensureUnique([
          ...(existing.themes?.endings ?? []),
          ...(ep.themes?.endings ?? []),
        ]);
        existing.themes = { openings, endings };
      } else {
        // SKYHOOK/TRAKT enrichment (only if missing)
        if (existing.duration == null && ep.duration != null) {
          existing.duration = ep.duration;
        }
        if (!existing.image && ep.image) existing.image = ep.image;
        if (!existing.synopsis && ep.synopsis) existing.synopsis = ep.synopsis;
        if (existing.tvdbShowId == null && ep.tvdbShowId != null) {
          existing.tvdbShowId = ep.tvdbShowId;
        }
        if (existing.tvdbId == null && ep.tvdbId != null) {
          existing.tvdbId = ep.tvdbId;
        }
        if (existing.seasonNumber == null && ep.seasonNumber != null) {
          existing.seasonNumber = ep.seasonNumber;
        }
        if (existing.episodeNumber == null && ep.episodeNumber != null) {
          existing.episodeNumber = ep.episodeNumber;
        }
        if (existing.aired == null && ep.aired != null) {
          existing.aired = ep.aired;
        }
        if (
          existing.absoluteEpisodeNumber == null &&
          ep.absoluteEpisodeNumber != null
        ) {
          existing.absoluteEpisodeNumber = ep.absoluteEpisodeNumber;
        }
        if (
          existing.airedAfterEpisodeNumber == null &&
          ep.airedAfterEpisodeNumber != null
        ) {
          existing.airedAfterEpisodeNumber = ep.airedAfterEpisodeNumber;
        }
        if (
          existing.airedAfterSeasonNumber == null &&
          ep.airedAfterSeasonNumber != null
        ) {
          existing.airedAfterSeasonNumber = ep.airedAfterSeasonNumber;
        }
        if (
          existing.airedBeforeEpisodeNumber == null &&
          ep.airedBeforeEpisodeNumber != null
        ) {
          existing.airedBeforeEpisodeNumber = ep.airedBeforeEpisodeNumber;
        }
        if (
          existing.airedBeforeSeasonNumber == null &&
          ep.airedBeforeSeasonNumber != null
        ) {
          existing.airedBeforeSeasonNumber = ep.airedBeforeSeasonNumber;
        }
        if (
          existing.absoluteEpisodeNumber == null &&
          ep.absoluteEpisodeNumber != null
        ) {
          existing.absoluteEpisodeNumber = ep.absoluteEpisodeNumber;
        }
      }
    }
  }

  // Produce ordered list: sort by alignment num, stable for ties by id
  const episodes = Array.from(index.values()).sort((a, b) => {
    const an = a.alignmentKey?.num ?? a.id;
    const bn = b.alignmentKey?.num ?? b.id;
    if (an !== bn) return an - bn;
    return a.id - b.id;
  });

  return { episodes };
};
