import { env } from '../../../../_shared/core/env.ts';
import { defaults, request } from '../../../../_shared/core/request.ts';
import { Service } from '../../../../_shared/types/state.d.ts';
import { ShowModel } from './types.d.ts';

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
