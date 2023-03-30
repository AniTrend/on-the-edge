import { logger } from '../../../_shared/core/logger.ts';
import { transform } from './transformer/index.ts';
import { getAnime } from './remote/index.ts';
import { NotifyAnime } from './types.d.ts';

export const getNotifyAnime = async (
  notify?: string,
): Promise<NotifyAnime | undefined> => {
  if (!notify) {
    logger.warn('notify id is not valid');
    return undefined;
  }
  return await getAnime(notify)
    .then(transform)
    .catch((e) => {
      logger.error('Unable to get notify anime from remote', e);
      return undefined;
    });
};
