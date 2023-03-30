import { logger } from '../../../_shared/core/logger.ts';
import { transform } from './transformer/index.ts';
import { details } from './remote/index.ts';
import { TmdbShow } from './types.d.ts';

export const getTmdbShow = async (
  tmdb?: number | null,
): Promise<TmdbShow | undefined> => {
  if (!tmdb) {
    logger.warn('The parameter `tmdb` is undefined');
    return undefined;
  }

  return await details(tmdb)
    .then(transform)
    .catch((e) => {
      logger.error('Unable to get show from remote', e);
      return undefined;
    });
};
