import { Growth } from '../types/core.d.ts';
import { logger } from '../core/logger.ts';
import { between } from 'x/optic';

const invoke = <T>(action: () => T): T => {
  logger.mark('experiment-check-start');
  const result = action();
  logger.mark('experiment-check-end');
  logger.measure(
    between('experiment-check-start', 'experiment-check-end'),
  );
  return result;
};

export const newsApiv2 = (growth: Growth): boolean =>
  invoke(() => growth.isOn('news-refactor-api'));
