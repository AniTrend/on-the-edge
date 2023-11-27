import { logger } from '../../../common/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getThemesByMalId } from './remote/index.ts';
import { AnimeTheme } from './types.d.ts';

export const getThemesForAnime = async (
  mal?: number,
): Promise<AnimeTheme[] | undefined> => {
  if (!mal) {
    logger.warn('The parameter `mal` is undefined');
    return undefined;
  }
  return await getThemesByMalId(mal)
    .then(transform)
    .catch((e) => {
      logger.warn('Unable to get themes from remote', e);
      return undefined;
    });
};
