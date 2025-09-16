import { logger } from '../../common/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getShowByTvdb } from './remote/index.ts';
import { SkyhookShow } from './types.ts';

export const getSkyhookShow = async (
  tvdb?: number,
): Promise<SkyhookShow | undefined> => {
  if (!tvdb) {
    logger.warn('The parameter `tvdb` is undefined');
    return undefined;
  }
  return await getShowByTvdb(tvdb)
    .then(transform)
    .catch((e) => {
      logger.warn('Unable to get skyhook show from remote', e);
      return undefined;
    });
};
