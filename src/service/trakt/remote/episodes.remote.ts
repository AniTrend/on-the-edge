import { env } from '@scope/common/core';
import { defaults, request } from '@scope/common/core';
import { Service } from '@scope/common/types';
import { EpisodeModel, SeasonModel } from './types.ts';

// Note: Tests should prefer stubbing fetch() or request() rather than using globals.

const getService = (): Service => ({
  url: env<string>('TRAKT'),
  credential: { id: env<string>('TRAKT_ID') },
});

const withHeaders = (init?: RequestInit): RequestInit => {
  const service = getService();
  return {
    ...defaults,
    ...init,
    headers: {
      ...defaults.headers,
      ...(init?.headers ?? {}),
      'trakt-api-version': '2',
      'trakt-api-key': service.credential.id!,
    },
  };
};

export const getTraktSeasons = async (
  traktIdOrSlug: number | string,
  opts: { includeEpisodes: boolean } = { includeEpisodes: false },
): Promise<SeasonModel[]> => {
  const service = getService();
  const params = new URLSearchParams();
  params.set('extended', 'full');
  if (opts.includeEpisodes) {
    params.set('extended', 'full,episodes');
  }
  const url = `${service.url}/shows/${traktIdOrSlug}/seasons?${params}`;
  return await request(url, withHeaders());
};

export const getTraktSeasonEpisodes = async (
  traktIdOrSlug: number | string,
  seasonNumber: number,
): Promise<EpisodeModel[]> => {
  const service = getService();
  const params = new URLSearchParams({ extended: 'full' });
  const url =
    `${service.url}/shows/${traktIdOrSlug}/seasons/${seasonNumber}/episodes?${params}`;
  return await request(url, withHeaders());
};
