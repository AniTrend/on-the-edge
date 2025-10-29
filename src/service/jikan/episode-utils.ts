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
 *  - recap => 'recap'
 *  - filler => 'filler'
 *  - if title contains 'OVA' => 'ova'
 *  - if title contains 'ONA' => 'ona'
 *  - else 'main'
 */
export const classifyEpisodeKind = (
  ep: { title?: string; recap?: boolean; filler?: boolean },
): 'recap' | 'filler' | 'ova' | 'ona' | 'main' | 'special' => {
  const t = (ep.title ?? '').toLowerCase();
  if (ep.recap) return 'recap';
  if (ep.filler) return 'filler';
  if (t.includes('ova')) return 'ova';
  if (t.includes('ona')) return 'ona';
  if (t.includes('special')) return 'special';
  return 'main';
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
