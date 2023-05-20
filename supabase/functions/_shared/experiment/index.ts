import { Growth } from '../types/core.d.ts';
import { logger } from '../core/logger.ts';
import { between } from 'x/optic';
import { PlatformSource } from './types.d.ts';

const invoke = <T>(action: () => T): T => {
  logger.mark('experiment-check-start');
  const result = action();
  logger.mark('experiment-check-end');
  logger.measure(
    between('experiment-check-start', 'experiment-check-end'),
  );
  return result;
};

export const isNewsApiv2Enabled = (growth: Growth): boolean =>
  invoke(() => growth.isOn('news-refactor-api'));

export const getPlatformSource = (growth: Growth): PlatformSource | undefined =>
  invoke(() => growth.getFeatureValue('api-platform-source', undefined));

export const isAnalyticsEnabled = (growth: Growth): boolean =>
  invoke(() => growth.isOn('enable-analytics'));
