import { logger } from '../../../_shared/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getSeasonBy, getShowById } from './remote/index.ts';
import { TmdbSeason, TmdbShow } from './types.d.ts';

export const getTmdbShow = async (
  tmdb?: number | null,
): Promise<TmdbShow | undefined> => {
  if (!tmdb) {
    logger.warn('The parameter `tmdb` is undefined');
    return undefined;
  }

  return await getShowById(tmdb)
    .then(transform)
    .catch((e) => {
      logger.warn('Unable to get show from remote', e);
      return undefined;
    });
};

export const getTmdbSeason = async (
  season: number,
  tmdb?: number | null,
): Promise<TmdbSeason | undefined> => {
  if (!tmdb) {
    logger.warn('The parameter `tmdb` is undefined');
    return undefined;
  }

  return await getSeasonBy(tmdb, season)
    .catch((e) => {
      logger.warn('Unable to get show from remote', e);
      return undefined;
    });
};
