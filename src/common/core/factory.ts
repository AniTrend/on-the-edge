import { Application, Router } from 'x/oak';
import { FactoryOptions } from '../types/options.d.ts';
import state from './setup.ts';
import timing from '../middleware/timing.ts';
import error from '../middleware/error.ts';
import growth from '../middleware/growth.ts';
import header from '../middleware/header.ts';
import targeting from '../middleware/targeting.ts';
import { logger } from './logger.ts';
import { between } from 'x/optic';

const app = new Application({
  state,
  contextState: 'prototype',
});

app.use(
  timing,
  header,
  growth,
  targeting,
  error,
);

app.addEventListener('error', (event) => {
  logger.critical(
    'common.core.factory:error: Uncaught application exception',
    event.error,
  );
});

export default (opts: FactoryOptions): Application => {
  logger.mark('factory-start');
  const router = opts.router ?? new Router();

  app.use(router.routes());
  app.use(router.allowedMethods());

  logger.mark('factory-end');
  logger.measure(between('factory-start', 'factory-end'));
  return app;
};
