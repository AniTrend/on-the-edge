import { logger } from '@scope/common/core';
import { transform } from './transformer/arm.transformer.ts';
import { getByAnilist, getByTvdb } from './remote/index.ts';
import { SeriesRelationId } from './types.ts';

export const getAniListRelationId = async (
  anilist?: number,
): Promise<SeriesRelationId | undefined> => {
  if (!anilist) {
    logger.warn('The parameter `anilist` is undefined');
    return undefined;
  }
  return await getByAnilist(anilist)
    .then(transform)
    .catch((e) => {
      logger.warn('Unable to get ids anilist from remote', e);
      return undefined;
    });
};

export const getRelationsByTvdb = async (
  tvdb?: number,
): Promise<SeriesRelationId[]> => {
  if (!tvdb) {
    logger.warn('The parameter `tvdb` is undefined');
    return [];
  }

  return await getByTvdb(tvdb)
    .then((data) => data.map(transform))
    .catch((e) => {
      logger.warn('Unable to get ids anilist from remote', e);
      return [];
    });
};
