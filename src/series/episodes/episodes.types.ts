import { Instant, toInstant } from '../../common/helpers/index.ts';
import { IPaging } from '../../common/types/paging.ts';
import { AnimeEpisode } from '../service/jikan/remote/types.ts';

// Canonical kind taxonomy across sources
export type EpisodeKind =
  | 'main'
  | 'ova'
  | 'ona'
  | 'recap'
  | 'filler'
  | 'special';

export interface EpisodeTilte {
  english: string | null;
  romanji: string | null;
  native: string | null;
}

// Canonical Episode representation (Phase A: directly from Jikan episodes_list)
// Will later evolve to merged multi-source episode model.
export interface EpisodeCanonical {
  id: number; // mal_id for now (stable within a show)
  number: number | null; // Same as id until alternate numbering introduced
  title: EpisodeTilte | null;
  synopsis: string | null; // Include synopsis by default per requirement
  aired: Instant | null; // ISO string from Jikan "aired"
  score: number | null;
  kind: EpisodeKind | null; // Derived classification (main|ova|ona|recap|filler|special)
  duration: number | null; // minutes
  url: string | null; // Jikan URL for reference
  // Optional provider metadata (populated when available from sources like Skyhook/Trakt/TMDB)
  tvdbShowId: number | null;
  tvdbId: number | null;
  tmdbId: number | null;
  seasonNumber: number | null;
  episodeNumber: number | null;
  absoluteEpisodeNumber: number | null;
  airedBeforeSeasonNumber: number | null;
  airedBeforeEpisodeNumber: number | null;
  airedAfterSeasonNumber: number | null;
  airedAfterEpisodeNumber: number | null;
  image: string | null; // episode still
  poster: string | null; // poster if available
  themes: {
    openings: string[];
    endings: string[];
  }; // from Jikan, themes/openings/endings
}

export interface EpisodeCursorPayload {
  pos: number; // zero-based index position in canonical ordered list
  hash: string; // filters hash to invalidate old cursors when filters change
}

export type EpisodeCursor = string; // base64 encoded JSON of EpisodeCursorPayload

export interface EpisodesQuery {
  id: string; // series id (anilist preferred; will resolve mapping)
  after?: EpisodeCursor; // forward cursor
  before?: EpisodeCursor; // backward cursor (exclusive)
  limit?: number; // page size (default 25, max 100)
}

export interface EpisodesPage extends IPaging<EpisodeCanonical> {
  // first: cursor for first item in this page (inherited optional)
  // last: cursor for last item in this page (inherited optional)
  total?: number; // total canonical episodes available (for client UI sizing)
}

export interface EpisodesDataResponse extends EpisodesPage {}

// Utility to project from AnimeEpisode -> EpisodeCanonical
// Augment AnimeEpisode with optional kind (added during enrichment step)
type MinimalEpisodeShape = Partial<AnimeEpisode> & {
  mal_id: number;
  kind?: string;
  themes?: {
    openings: string[];
    endings: string[];
  } | null;
};

const asEpisodeKind = (k: unknown): EpisodeKind | null => {
  switch (k) {
    case 'main':
    case 'ova':
    case 'ona':
    case 'recap':
    case 'filler':
    case 'special':
      return k;
    default:
      return null;
  }
};

export const toCanonicalEpisode = (
  ep: MinimalEpisodeShape,
): EpisodeCanonical => ({
  id: ep.mal_id,
  number: ep.mal_id, // until alternate numbering support
  title: {
    english: ep.title ?? null,
    native: ep.title_japanese ?? null,
    romanji: ep.title_romanji ?? null,
  },
  synopsis: ep.synopsis ?? null,
  aired: ep.aired ? toInstant(ep.aired) : null,
  score: ep.score ?? null, // placeholder until scoring source integrated
  kind: ep.filler ? 'filler' : ep.recap ? 'recap' : asEpisodeKind(ep.kind),
  duration: ep.duration ?? null,
  url: ep.url ?? null,
  tvdbShowId: null,
  tvdbId: null,
  tmdbId: null,
  seasonNumber: null,
  episodeNumber: ep.mal_id ?? null,
  absoluteEpisodeNumber: null,
  airedBeforeSeasonNumber: null,
  airedBeforeEpisodeNumber: null,
  airedAfterSeasonNumber: null,
  airedAfterEpisodeNumber: null,
  image: null,
  poster: null,
  themes: ep.themes ?? { openings: [], endings: [] },
});
