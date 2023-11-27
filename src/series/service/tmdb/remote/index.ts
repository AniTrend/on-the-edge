import { env } from '../../../../common/core/env.ts';
import { Service } from '../../../../common/types/state.d.ts';
import { request } from '../../../../common/core/request.ts';
import { Configuration, Movie, Season, Show } from './types.d.ts';

const getService = (): Service => ({
  url: env<string>('TMDB'),
  credential: {
    key: env<string>('TMDB_KEY'),
  },
});

export const getConfig = async (): Promise<Configuration> => {
  const service = getService();
  const params = new URLSearchParams({
    api_key: service.credential.key!,
  });

  return await request<Configuration>(
    `${service.url}/configuration?${params}`,
  ).catch(() => ({
    change_keys: [],
    images: {
      base_url: 'http://image.tmdb.org/t/p/',
      secure_base_url: 'https://image.tmdb.org/t/p/',
      backdrop_sizes: [
        'w300',
        'w780',
        'w1280',
        'original',
      ],
      logo_sizes: [
        'w45',
        'w92',
        'w154',
        'w185',
        'w300',
        'w500',
        'original',
      ],
      poster_sizes: [
        'w45',
        'w92',
        'w154',
        'w185',
        'w300',
        'w500',
        'original',
      ],
      profile_sizes: [
        'w45',
        'w185',
        'h632',
        'original',
      ],
      still_sizes: [
        'w92',
        'w185',
        'w300',
        'original',
      ],
    },
  }));
};

export const getShowById = async (id: number): Promise<Show> => {
  const service = getService();
  const params = new URLSearchParams({
    api_key: service.credential.key!,
    append_to_response: 'images',
  });

  return await request<Show>(
    `${service.url}/tv/${id}?${params}`,
  );
};

export const getSeasonBy = async (
  showId: number,
  season: number,
): Promise<Season> => {
  const service = getService();
  const params = new URLSearchParams({
    api_key: service.credential.key!,
    append_to_response: 'images',
  });
  return await request(
    `${service.url}/tv/${showId}/season/${season}?${params}`,
  );
};

export const getMovieById = async (id: number): Promise<Movie> => {
  const service = getService();
  const params = new URLSearchParams({
    api_key: service.credential.key!,
    append_to_response: 'images',
  });
  return await request(
    `${service.url}/movie/${id}?${params}`,
  );
};
