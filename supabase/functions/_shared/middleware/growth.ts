import { between } from 'x/optic';
import { logger } from '../core/logger.ts';
import type { AppContext } from '../types/core.d.ts';

export default async (
  { state }: AppContext,
  next: () => Promise<unknown>,
) => {
  logger.mark('load-features-start');
  await state.growth.loadFeatures({
    autoRefresh: true,
    timeout: 2000,
  })
    .then(() => {
      logger.mark('load-features-end');
      logger.measure(between('load-features-start', 'load-features-end'));
    })
    .catch((e) => {
      logger.error('Failed to load features from GrowthBook', e);
    })
    .finally(async () => {
      await next();
    })
    .then(() => {
      logger.mark('destory-growth-start');
      state.growth.destroy();
      logger.mark('destory-growth-end');
      logger.measure(between('destory-growth-start', 'destory-growth-end'));
    })
    .catch((e) => {
      logger.error('Failed to destory GrowthBook', e);
    });
};
