import { env } from '@scope/common/core';
import { defaults, request } from '@scope/common/core';
import { Service } from '@scope/common/types';
import { ShowModel } from './types.ts';

const getService = (): Service => ({
  url: env<string>('TRAKT'),
  credential: {
    id: env<string>('TRAKT_ID'),
  },
});

export const getTraktShowByIdOrSlug = async (
  tvdb: number | string,
): Promise<ShowModel> => {
  const service = getService();
  const params = new URLSearchParams({
    extended: 'full',
  });
  return await request(
    `${service.url}/shows/${tvdb}?${params}`,
    {
      ...defaults,
      headers: {
        ...defaults.headers,
        'trakt-api-version': '2',
        'trakt-api-key': service.credential.id!,
      },
    },
  );
};
