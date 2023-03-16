import { experiments } from './constants.ts';
import { Growth } from '../types/core.d.ts';
import { logger } from '../core/logger.ts';
import { ExperimentId } from './types.d.ts';
import { between } from 'x/optic';

const isOn = (growth: Growth, experiment: ExperimentId): boolean => {
  logger.mark('experiment-check-start');
  const isOn = growth.isOn(experiment);
  logger.mark('experiment-check-end');
  logger.measure(
    between('experiment-check-start', 'experiment-check-end'),
    experiment,
  );
  return isOn;
};

export const newsApiv2 = (growth: Growth): boolean =>
  isOn(growth, experiments.news_refactor_api);
