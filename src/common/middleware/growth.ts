import { between } from 'x/optic';
import { logger } from '../core/logger.ts';
import type { AppContext } from '../types/core.d.ts';
import { env } from '../core/env.ts';

export default async (
  { state }: AppContext,
  next: () => Promise<unknown>,
) => {
  logger.mark('load-features-start');
  await state.features.init({
    timeout: env<number>('GROWTH_TIME_OUT'),
  })
    .then((data) => {
      if (data.error) {
        logger.error('common.middleware.growth: GrowthBook init error', data.error);
      } else {
        logger.info('common.middleware.growth: GrowthBook init complete', data.source);
      }
      logger.mark('load-features-end');
      logger.measure(between('load-features-start', 'load-features-end'));
    })
    .catch((e) => {
      logger.error('common.middleware.growth: Failed to load features from GrowthBook', e);
    })
    .finally(async () => {
      await next();
    })
    .then(() => {
      logger.mark('destory-growth-start');
      state.features.destroy();
      logger.mark('destory-growth-end');
      logger.measure(between('destory-growth-start', 'destory-growth-end'));
    })
    .catch((e) => {
      logger.error('common.middleware.growth: Failed to destory GrowthBook', e);
    });
};
