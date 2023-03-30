import { Application, Router } from 'x/oak';
import { FactoryOptions } from '../types/options.d.ts';
import state from '../core/setup.ts';
import timing from '../middleware/timing.ts';
import error from '../middleware/error.ts';
import header from '../middleware/header.ts';
import growth from '../middleware/growth.ts';
import { logger } from './logger.ts';
import { between } from 'x/optic';

const app = new Application({
  state,
  contextState: 'prototype',
});

export default (opts: FactoryOptions): Application => {
  logger.mark('factory-start');
  const router = opts.router ?? new Router();

  app.use(
    timing,
    header,
    growth,
    error,
  );

  app.addEventListener('error', (event) => {
    logger.critical('Uncaught application exception', event.error);
  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  logger.mark('factory-end');
  logger.measure(between('factory-start', 'factory-end'));
  return app;
};
