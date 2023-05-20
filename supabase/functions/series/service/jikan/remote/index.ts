import { env } from '../../../../_shared/core/env.ts';
import { request } from '../../../../_shared/core/request.ts';
import { AnimeResource, MangaResource } from './types.d.ts';
import { Service } from '../../../../_shared/types/state.d.ts';
import { type IResponse } from '../../../../_shared/types/response.d.ts';

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
