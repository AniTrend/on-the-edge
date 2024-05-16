import { State } from '../types/state.d.ts';
import { env } from './env.ts';
import { GrowthBook } from 'esm/growthbook';
import { logger } from './logger.ts';
import { between } from 'x/optic';
import _localSourceFactory from '../mongo/factory.ts';

logger.mark('setup-start');

const applicationState: State = {
  credential: {
    supabase: {
      id: env<string>('SUPABASE_ID'),
      key: env<string>('SUPABASE_API_KEY'),
    },
  },
  features: new GrowthBook({
    apiHost: env<string>('GROWTH'),
    clientKey: env<string>('GROWTH_KEY'),
    enableDevMode: env<boolean>('GROWTH_DEV_MODE'),
    log: (msg, ctx) => {
      logger.info(msg, ctx);
    },
    trackingCallback: (experiment, result) => {
      // substitute with segment or something else for exp tracking
      logger.debug('Experiemnt tracked', {
        experimentId: experiment.key,
        variationId: result.key,
      });
    },
    onFeatureUsage: (featureKey, result) => {
      logger.debug('Feature used', { key: featureKey, value: result.value });
    },
  }),
  contextHeader: {
    agent: '',
    accepts: [],
    authorization: null,
    contentType: null,
    acceptEncoding: '',
  },
  local: await _localSourceFactory.connect(),
};

const onTerminationRequest = (signal: Deno.Signal): void => {
  logger.debug(
    `common.core.setup:onTerminationRequest: OS dispatched signal '${signal}'`,
  );
  _localSourceFactory.disconnect();
  logger.debug(
    `common.core.setup:onTerminationRequest: Attempting to exit Deno process`,
  );
  Deno.exit();
};

Deno.addSignalListener('SIGINT', () => onTerminationRequest('SIGINT'));
Deno.addSignalListener('SIGTERM', () => onTerminationRequest('SIGTERM'));

logger.mark('setup-end');
logger.measure(between('setup-start', 'setup-end'));

export default applicationState;
