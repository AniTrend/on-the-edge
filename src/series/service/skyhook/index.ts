import { logger } from '../../../common/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getShowByTvdb } from './remote/index.ts';
import { SkyhookShow } from './types.d.ts';

export const getSkyhookShow = async (
  tmdb?: number,
): Promise<SkyhookShow | undefined> => {
  if (!tmdb) {
    logger.warn('The parameter `tmdb` is undefined');
    return undefined;
  }
  return await getShowByTvdb(tmdb)
    .then(transform)
    .catch((e) => {
      logger.warn('Unable to get skyhook show from remote', e);
      return undefined;
    });
};
