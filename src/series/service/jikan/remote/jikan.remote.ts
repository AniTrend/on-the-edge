import { env } from '../../../../common/core/env.ts';
import { request } from '../../../../common/core/request.ts';
import { AnimeEpisode, AnimeResource, MangaResource } from './types.ts';
import { Service } from '../../../../common/types/state.ts';
import { type IResponse } from '../../../../common/types/response.ts';

const getService = (): Service => ({
  url: env<string>('MAL'),
  credential: {},
});

export const getAnime = async (id: number): Promise<AnimeResource> => {
  const service = getService();
  return await request<IResponse<AnimeResource>>(
    `${service.url}/anime/${id}`,
  ).then((response) => response.data!);
};

export const getManga = async (id: number): Promise<MangaResource> => {
  const service = getService();
  return await request<IResponse<MangaResource>>(
    `${service.url}/manga/${id}`,
  ).then((response) => response.data!);
};

/**
 * Fetches the full aggregated anime object (`/anime/{id}/full`).
 * Falls back to base getAnime if full endpoint fails (network or 404) to stay resilient.
 */
export const getAnimeFull = async (id: number): Promise<AnimeResource> => {
  const service = getService();
  try {
    return await request<IResponse<AnimeResource>>(
      `${service.url}/anime/${id}/full`,
    ).then((response) => response.data!);
  } catch (_) {
    return await getAnime(id);
  }
};

/**
 * Fetches the full aggregated manga object (`/manga/{id}/full`).
 * Falls back to base getManga on failure.
 */
export const getMangaFull = async (id: number): Promise<MangaResource> => {
  const service = getService();
  try {
    return await request<IResponse<MangaResource>>(
      `${service.url}/manga/${id}/full`,
    ).then((response) => response.data!);
  } catch (_) {
    return await getManga(id);
  }
};

/**
 * Fetches ALL episodes for an anime, traversing paginated `/anime/{id}/episodes`.
 * We stop on empty page or error. Pagination param: `page=` starting at 1.
 */
export const getAnimeEpisodes = async (
  id: number,
  opts?: { limit?: number; window?: { from?: number; to?: number } },
): Promise<AnimeEpisode[]> => {
  const service = getService();
  const episodes: AnimeEpisode[] = [];
  let page = 1;
  while (page < 100) { // hard safety cap
    try {
      const pageData = await request<
        { data: AnimeEpisode[]; pagination?: { has_next_page: boolean } }
      >(
        `${service.url}/anime/${id}/episodes?page=${page}`,
      ).then((r) => r.data ?? []);
      if (!Array.isArray(pageData) || pageData.length === 0) break;
      // Optional window filtering early (assumes mal_id roughly linear)
      const filtered = !opts?.window ? pageData : pageData.filter((ep) => {
        const num = ep.mal_id;
        if (opts.window?.from != null && num < opts.window.from) return false;
        if (opts.window?.to != null && num > opts.window.to) return false;
        return true;
      });
      episodes.push(...filtered);
      if (opts?.limit != null && episodes.length >= opts.limit) {
        return episodes.slice(0, opts.limit);
      }
      // Best effort: if pagination metadata missing assume no next page once returned less than typical page size (assumed 25)
      if (pageData.length < 25) break;
    } catch (_) {
      break;
    }
    page += 1;
  }
  return episodes;
};

/**
 * Fetches additional information for an anime (separate endpoint in Jikan v4)
 */
export const getAnimeMoreInfo = async (id: number): Promise<string | null> => {
  const service = getService();
  return await request<{ data: { moreinfo?: string | null } }>(
    `${service.url}/anime/${id}/moreinfo`,
  ).then((response) => response.data?.moreinfo ?? null).catch(() => null);
};

/**
 * Fetches additional information for a manga (separate endpoint in Jikan v4)
 */
export const getMangaMoreInfo = async (id: number): Promise<string | null> => {
  const service = getService();
  return await request<{ data: { moreinfo?: string | null } }>(
    `${service.url}/manga/${id}/moreinfo`,
  ).then((response) => response.data?.moreinfo ?? null).catch(() => null);
};
