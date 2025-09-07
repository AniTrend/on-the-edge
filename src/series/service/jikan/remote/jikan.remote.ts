import { env } from '../../../../common/core/env.ts';
import { request } from '../../../../common/core/request.ts';
import { AnimeResource, MangaResource } from './types.ts';
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
