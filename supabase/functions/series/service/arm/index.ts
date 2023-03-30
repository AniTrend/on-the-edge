import { logger } from '../../../_shared/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getByAnilist } from './remote/index.ts';
import { AnimeRelationId } from './types.d.ts';

export const getAniListRelationId = async (
  anilist?: number,
): Promise<AnimeRelationId | undefined> => {
  if (!anilist) {
    logger.warn('anilist id is not valid');
    return undefined;
  }
  return await getByAnilist(anilist)
    .then(transform)
    .catch((e) => {
      logger.error('Unable to get ids anilist from remote', e);
      return undefined;
    });
};
