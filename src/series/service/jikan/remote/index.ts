import { env } from '../../../../common/core/env.ts';
import { request } from '../../../../common/core/request.ts';
import { AnimeResource, MangaResource } from './types.d.ts';
import { Service } from '../../../../common/types/state.d.ts';
import { type IResponse } from '../../../../common/types/response.d.ts';

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
