import type { AnimeEpisode, AnimeResource } from './jikan.types.ts';

/** Default maximum episodes fetched unless overridden. */
export const DEFAULT_MAX_EPISODES = 100;

export interface EpisodeLimitResult {
  episodes: AnimeEpisode[];
  truncated: boolean;
}

/**
 * Applies max cap & window filtering to a list of episodes.
 */
export const applyEpisodeLimit = (
  episodes: AnimeEpisode[] | undefined,
  opts: {
    max?: number;
    window?: { from?: number; to?: number };
  },
): EpisodeLimitResult => {
  if (!episodes || episodes.length === 0) {
    return { episodes: [], truncated: false };
  }
  const { max, window } = opts;
  let filtered = episodes;

  if (window && (window.from != null || window.to != null)) {
    filtered = filtered.filter((ep) => {
      const num = ep.mal_id; // MAL episode id is sequential within show for most cases
      if (window.from != null && num < window.from) return false;
      if (window.to != null && num > window.to) return false;
      return true;
    });
  }

  if (max != null && filtered.length > max) {
    return { episodes: filtered.slice(0, max), truncated: true };
  }
  return { episodes: filtered, truncated: false };
};

/**
 * Classify episode into a coarse kind category.
 * Heuristics (can refine later with TheXEM + provider data):
 *  - recap => 'RECAP'
 *  - filler => 'FILLER'
 *  - if title contains 'OVA' => 'OVA'
 *  - if title contains 'ONA' => 'ONA'
 *  - else 'MAIN'
 */
export const classifyEpisodeKind = (
  ep: { title?: string; recap?: boolean; filler?: boolean },
): 'RECAP' | 'FILLER' | 'OVA' | 'ONA' | 'MAIN' | 'SPECIAL' => {
  const t = (ep.title ?? '').toLowerCase();
  if (ep.recap) return 'RECAP';
  if (ep.filler) return 'FILLER';
  if (t.includes('ova')) return 'OVA';
  if (t.includes('ona')) return 'ONA';
  if (t.includes('special')) return 'SPECIAL';
  return 'MAIN';
};

/** Convenience to apply truncation flags onto resource object. */
export const attachEpisodes = (
  resource: AnimeResource,
  episodes: AnimeEpisode[],
  truncated: boolean,
): AnimeResource => ({
  ...resource,
  episodes_list: episodes,
  episodes_truncated: truncated,
});
