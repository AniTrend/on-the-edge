import { logger } from '../../../common/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getTraktShowByIdOrSlug } from './remote/index.ts';
import { TraktShow } from './types.d.ts';

export const getTraktShow = async (
  trakt?: number | string,
): Promise<TraktShow | undefined> => {
  if (!trakt) {
    logger.warn('The parameter `trakt` or slug is not valid');
    return undefined;
  }
  return await getTraktShowByIdOrSlug(trakt)
    .then(transform)
    .catch((e) => {
      logger.info('Unable to transform show from remote', e);
      return undefined;
    });
};
