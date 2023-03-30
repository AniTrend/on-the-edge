import { env } from '../../../../_shared/core/env.ts';
import { Service } from '../../../../_shared/types/state.d.ts';
import { request } from '../../../../_shared/core/request.ts';
import { Show } from './types.d.ts';

const getService = (): Service => ({
  url: env<string>('TMDB'),
  credential: {
    key: env<string>('TMDB_KEY'),
  },
});

export const details = (id: number): Promise<Show> => {
  const service = getService();
  const params = new URLSearchParams({
    api_key: service.credential.key!,
    language: 'en-US',
    append_to_response: 'images',
  });

  return request<Show>(
    `${service.url}/tv/${id}?${params}`,
  );
};
