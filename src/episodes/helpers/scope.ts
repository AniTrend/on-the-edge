import type { EpisodeCanonical } from '../episodes.types.ts';
import type {
  SkyhookEpisode,
  SkyhookShow,
} from '../../service/skyhook/types.ts';
import { toInstant } from '../../common/helpers/date.ts';

export type SeasonEpisodePair = { season: number; episode: number };

export type ScopeStats = {
  attempted: number; // skyhook episodes considered
  exactMatches: number;
  fuzzyMatches: number;
};

const normalizeTitle = (t?: string | null): string =>
  (t ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');

const withinDay = (
  a?: number | null,
  b?: number | null,
  tolDays = 1,
): boolean => {
  if (a == null || b == null) return false;
  const day = (x: number) => Math.floor((x * 1000) / 86400000);
  return Math.abs(day(a) - day(b)) <= tolDays;
};

export function deriveSeasonScope(
  canonical: EpisodeCanonical[],
  skyhook: SkyhookShow | null | undefined,
  titleSimThreshold?: number,
): { pairs: SeasonEpisodePair[]; stats: ScopeStats } {
  if (!skyhook?.episodes?.length) {
    return {
      pairs: [],
      stats: { attempted: 0, exactMatches: 0, fuzzyMatches: 0 },
    };
  }

  const canonMeta = canonical.map((e) => ({
    titleNorm: normalizeTitle(
      e.title?.english ?? e.title?.romanji ?? e.title?.native ?? null,
    ),
    aired: e.aired,
  }));

  const pairs: SeasonEpisodePair[] = [];
  let exactMatches = 0;
  let fuzzyMatches = 0;
  let attempted = 0;

  const sim = (a: string, b: string): number => {
    if (!a || !b) return 0;
    if (a === b) return 1;
    if (a.length < 2 || b.length < 2) return 0;
    const grams = (s: string) => {
      const m = new Map<string, number>();
      for (let i = 0; i < s.length - 1; i++) {
        const g = s.substring(i, i + 2);
        m.set(g, (m.get(g) ?? 0) + 1);
      }
      return m;
    };
    const A = grams(a), B = grams(b);
    let overlap = 0;
    for (const [g, c] of A) overlap += Math.min(c, B.get(g) ?? 0);
    const total = (a.length - 1) + (b.length - 1);
    return (2 * overlap) / total;
  };

  const threshold = titleSimThreshold == null
    ? undefined
    : Math.max(0, Math.min(1, titleSimThreshold));

  const asInstant = (e: SkyhookEpisode) =>
    e.airDateUtc
      ? toInstant(e.airDateUtc)
      : (e.airDate ? toInstant(e.airDate) : null);

  for (const ep of skyhook.episodes) {
    attempted++;
    const s = ep.seasonNumber;
    const n = ep.episodeNumber;
    if (s == null || n == null) continue;

    const skyTitle = normalizeTitle(ep.title ?? null);
    const skyAired = asInstant(ep);

    // Exact: title AND aired instant equal
    const exact = canonMeta.some((m) =>
      skyTitle && m.titleNorm === skyTitle && m.aired != null &&
      skyAired != null && m.aired === skyAired
    );
    if (exact) {
      pairs.push({ season: s, episode: n });
      exactMatches++;
      continue;
    }

    // Fallback A: normalized title equal (ignore air-date when canonical lacks it)
    const titleOnlyEqual = canonMeta.some((m) =>
      skyTitle && m.titleNorm === skyTitle
    );
    if (titleOnlyEqual) {
      pairs.push({ season: s, episode: n });
      fuzzyMatches++;
      continue;
    }

    // Fallback B: aired within ±1 day AND normalized title equal
    const nearAndEqual = canonMeta.some((m) =>
      skyTitle && m.titleNorm === skyTitle &&
      withinDay(m.aired ?? null, skyAired, 1)
    );
    if (nearAndEqual) {
      pairs.push({ season: s, episode: n });
      fuzzyMatches++;
      continue;
    }

    // Fallback C: aired within ±1 day AND title similarity ≥ threshold
    if (threshold != null) {
      const nearAndSimilar = canonMeta.some((m) =>
        withinDay(m.aired ?? null, skyAired, 1) &&
        sim(m.titleNorm, skyTitle) >= threshold
      );
      if (nearAndSimilar) {
        pairs.push({ season: s, episode: n });
        fuzzyMatches++;
        continue;
      }
    }
  }

  return { pairs, stats: { attempted, exactMatches, fuzzyMatches } };
}

export const helpers = { normalizeTitle, withinDay };
