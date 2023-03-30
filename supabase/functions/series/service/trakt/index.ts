import { logger } from '../../../_shared/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getTraktShowByIdOrSlug } from './remote/index.ts';
import { TraktShow } from './types.d.ts';

export const getTraktShow = async (
  identifier?: number | string,
): Promise<TraktShow | undefined> => {
  if (!identifier) {
    logger.warn('trakt id or slug is not valid');
    return undefined;
  }
  return await getTraktShowByIdOrSlug(identifier)
    .then(transform)
    .catch((e) => {
      logger.error('Unable to get ids anilist from remote', e);
      return undefined;
    });
};
