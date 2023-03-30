import { logger } from '../../../_shared/core/logger.ts';
import { animeTransform, mangaTransform } from './transformer/index.ts';
import { getAnime, getManga } from './remote/index.ts';
import { JikanAnime, JikanManga } from './types.d.ts';

export const getJikanAnime = async (
  mal?: number | null,
): Promise<JikanAnime | undefined> => {
  if (!mal) {
    logger.warn('mal id is not valid');
    return undefined;
  }
  return await getAnime(mal)
    .then(animeTransform)
    .catch((e) => {
      logger.error('Unable to get jikan show from remote', e);
      return undefined;
    });
};

export const getJikanManga = async (
  mal?: number | null,
): Promise<JikanManga | undefined> => {
  if (!mal) {
    logger.warn('mal id is not valid');
    return undefined;
  }
  return await getManga(mal)
    .then(mangaTransform)
    .catch((e) => {
      logger.error('Unable to get jikan manga from remote', e);
      return undefined;
    });
};
