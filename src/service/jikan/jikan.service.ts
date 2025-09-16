import { logger } from '../../common/core/logger.ts';
import { animeTransform, mangaTransform } from './transformer/index.ts';
import {
  getAnimeEpisodes,
  getAnimeFull,
  getAnimeMoreInfo,
  getMangaFull,
  getMangaMoreInfo,
} from './remote/index.ts';
import { JikanAnime, JikanFetchOptions, JikanManga } from './types.ts';
import { DEFAULT_MAX_EPISODES, enrichEpisodes } from './episode-utils.ts';

export const getJikanAnime = async (
  mal?: number | null,
  options?: JikanFetchOptions,
): Promise<JikanAnime | undefined> => {
  if (!mal) {
    logger.warn('The parameter `mal` is undefined');
    return undefined;
  }
  try {
    const [anime, moreinfo] = await Promise.all([
      getAnimeFull(mal),
      getAnimeMoreInfo(mal),
    ]);

    let episodes_list = undefined;
    let truncated = false;
    if (options?.episodes) {
      const limit = options.maxEpisodes ?? anime.episodes ??
        DEFAULT_MAX_EPISODES;
      const raw = await getAnimeEpisodes(mal, {
        limit,
        window: options.episodeWindow,
      });
      episodes_list = enrichEpisodes(raw);
      truncated = episodes_list.length >= limit;
    }

    return animeTransform({
      ...anime,
      moreinfo,
      episodes_list,
      episodes_truncated: truncated || undefined,
    });
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
      getMangaFull(mal),
      getMangaMoreInfo(mal),
    ]);
    return mangaTransform({ ...manga, moreinfo });
  } catch (e) {
    logger.warn('Unable to get jikan manga from remote', e);
    return undefined;
  }
};
