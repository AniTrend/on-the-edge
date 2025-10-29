import type {
  AnimeResource,
  AnimeType,
  MangaResource,
  MangaType,
} from './jikan.types.ts';

/**
 * Fetch behavior options for Jikan integration. Defaults are intentionally conservative to avoid
 * huge payloads on very long running shows (e.g. One Piece) unless explicitly requested.
 */
export interface JikanFetchOptions {
  episodes?: boolean; // include episodes_list (default false)
  relations?: boolean; // future: include relations array from full endpoint
  external?: boolean; // include external links
  streaming?: boolean; // include streaming links
  theme?: boolean; // include theme/openings/endings
  characters?: boolean; // include character array
  staff?: boolean; // include staff array
  /** Hard cap for episodes to fetch (default 100). */
  maxEpisodes?: number;
  /** Fetch only a window/range of episode numbers (inclusive). */
  episodeWindow?: { from?: number; to?: number };
}

/**
 * Jikan anime model enriched with optional moreinfo text aggregated from the `/anime/{id}/moreinfo` endpoint.
 */
export type JikanAnime = AnimeResource;

/**
 * Jikan manga model enriched with optional moreinfo text aggregated from the `/manga/{id}/moreinfo` endpoint.
 */
export type JikanManga = MangaResource;

export type Jikan = JikanAnime | JikanManga;

export type JikanType = AnimeType | MangaType;
