import { Features } from '../types/core.ts';
import { logger } from '../core/logger.ts';
import { between } from '@optic';
import { PlatformSource } from './types.ts';

const invoke = <T>(action: () => T): T => {
  logger.mark('experiment-check-start');
  const result = action();
  logger.mark('experiment-check-end');
  logger.measure(
    between('experiment-check-start', 'experiment-check-end'),
  );
  return result;
};

export const isNewsApiv2Enabled = (growth: Features): boolean =>
  invoke(() => growth.isOn('news-refactor-api'));

export const getPlatformSource = (
  growth: Features,
): PlatformSource | undefined =>
  invoke(() => growth.getFeatureValue('platform-source', undefined));

export const isAnalyticsEnabled = (growth: Features): boolean =>
  invoke(() => growth.isOn('enable-analytics'));

export const isXemNormalizationEnabled = (growth: Features): boolean =>
  invoke(() => growth.isOn('episode-number-normalize-xem'));

export const getTitleSimThreshold = (growth: Features): number | undefined =>
  invoke(() => growth.getFeatureValue('episode-align-title-sim', undefined));
