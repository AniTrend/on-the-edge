import { logger } from '../../../common/core/logger.ts';
import { animeTransform, mangaTransform } from './transformer/index.ts';
import {
  getAnime,
  getAnimeMoreInfo,
  getManga,
  getMangaMoreInfo,
} from './remote/index.ts';
import { JikanAnime, JikanManga } from './types.ts';

export const getJikanAnime = async (
  mal?: number | null,
): Promise<JikanAnime | undefined> => {
  if (!mal) {
    logger.warn('The parameter `mal` is undefined');
    return undefined;
  }
  try {
    const [anime, moreinfo] = await Promise.all([
      getAnime(mal),
      getAnimeMoreInfo(mal),
    ]);
    return animeTransform({ ...anime, moreinfo });
  } catch (e) {
    logger.warn('Unable to get jikan show from remote', e);
    return undefined;
  }
};

export const getJikanManga = async (
  mal?: number | null,
): Promise<JikanManga | undefined> => {
  if (!mal) {
    logger.warn('The parameter `mal` is undefined');
    return undefined;
  }
  try {
    const [manga, moreinfo] = await Promise.all([
      getManga(mal),
      getMangaMoreInfo(mal),
    ]);
    return mangaTransform({ ...manga, moreinfo });
  } catch (e) {
    logger.warn('Unable to get jikan manga from remote', e);
    return undefined;
  }
};
