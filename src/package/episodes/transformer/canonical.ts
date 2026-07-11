import type { AnimeEpisode } from '@scope/service/jikan';
import type { EpisodeCanonical, EpisodeKind } from '../episodes.types.ts';

/**
 * Transform Jikan AnimeEpisode to canonical episode format.
 *
 * Determines episode kind based on special flags (filler, recap, etc.)
 * and transforms air dates to Unix epoch seconds.
 *
 * @param source Jikan episode data
 * @returns Canonical episode with normalized fields
 */
export function toCanonicalEpisode(source: AnimeEpisode): EpisodeCanonical {
  // Determine kind from explicit field or Jikan flags
  let kind: EpisodeKind | null = null;

  // Check explicit kind field first (used in tests and some sources)
  if ((source as { kind?: string }).kind) {
    const k = (source as { kind?: string }).kind!.toUpperCase();
    if (['MAIN', 'OVA', 'ONA', 'RECAP', 'FILLER', 'SPECIAL'].includes(k)) {
      kind = k as EpisodeKind;
    }
  }

  // Fallback to Jikan boolean flags
  if (!kind && source.filler === true) kind = 'FILLER';
  if (!kind && source.recap === true) kind = 'RECAP';
  if (!kind) kind = 'MAIN'; // Default fallback

  return {
    id: source.mal_id,
    number: source.mal_id,
    title: {
      english: source.title ?? null,
      native: source.title_japanese ?? null,
      romanji: source.title_romanji ?? null,
    },
    synopsis: source.synopsis ?? null,
    aired: source.aired
      ? Math.floor(new Date(source.aired).getTime() / 1000)
      : null,
    score: source.score ?? null,
    kind,
    duration: source.duration ? source.duration / 60 : null, // Convert seconds to minutes
    url: source.url ?? null,
    tvdbShowId: null,
    tvdbId: null,
    tmdbId: null,
    seasonNumber: null,
    episodeNumber: null,
    absoluteEpisodeNumber: null,
    airedBeforeSeasonNumber: null,
    airedBeforeEpisodeNumber: null,
    airedAfterSeasonNumber: null,
    airedAfterEpisodeNumber: null,
    image: null,
    poster: null,
    themes: {
      openings: [],
      endings: [],
    },
  };
}
