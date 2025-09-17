import { env } from '@scope/common/core';
import { request } from '@scope/common/core';
import { Service } from '@scope/common/types';
import { AnimeModel, EpisodeIdModel, EpisodeModel } from './types.ts';

const getService = (): Service => ({
  url: env<string>('NOTIFY'),
  credential: {},
});

export const getAnime = async (notify: string): Promise<AnimeModel> => {
  const service = getService();
  return await request(`${service.url}/anime/${notify}`);
};

export const getEpisode = async (
  episodeId: EpisodeIdModel,
): Promise<EpisodeModel> => {
  const service = getService();
  return await request(`${service.url}/episode/${episodeId}`);
};
