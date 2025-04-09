import { logger } from '../../../common/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getAnime, getEpisode } from './remote/index.ts';
import { NotifyAnime } from './types.ts';
import { AnimeModel, EpisodeModel } from './remote/types.ts';

export type EnrichedAnimeData = Omit<AnimeModel, 'episodes'> & {
  episodes: EpisodeModel[];
};

export const getNotifyAnime = async (
  notify?: string,
): Promise<NotifyAnime | undefined> => {
  if (!notify) {
    logger.warn('The parameter `notify` is undefined');
    return undefined;
  }

  try {
    const model = await getAnime(notify);

    const episodes: EpisodeModel[] = await Promise.all(
      model.episodes.map(getEpisode)
    );

    return transform({
      ...model,
      episodes,
    });
  } catch (e) {
    logger.warn('Unable to get notify anime or episode data from remote', e);
    return undefined;
  }
};
