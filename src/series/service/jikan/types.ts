import { AnimeResource, MangaResource } from './remote/types.ts';

/**
 * Jikan anime model enriched with optional moreinfo text aggregated from the `/anime/{id}/moreinfo` endpoint.
 */
export interface JikanAnime extends AnimeResource {
  moreinfo?: string | null;
}

/**
 * Jikan manga model enriched with optional moreinfo text aggregated from the `/manga/{id}/moreinfo` endpoint.
 */
export interface JikanManga extends MangaResource {
  moreinfo?: string | null;
}

export type Jikan = JikanAnime | JikanManga;
